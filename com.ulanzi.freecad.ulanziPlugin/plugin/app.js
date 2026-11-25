import UlanziApi, { Utils } from "./plugin-common-node/index.js";
import WebSocket from "ws";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import "./commands.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLUGIN_ROOT = Utils.getPluginPath() || path.resolve(__dirname, "..");

const { COMMANDS, WORKBENCH_PAGES, DIALOG_NUMPAD_SLOTS } = globalThis.FREECAD_CATALOG || {
  COMMANDS: Object.create(null),
  WORKBENCH_PAGES: Object.assign(Object.create(null), {
    default: [{ name: "Default", slots: Object.create(null) }],
  }),
  DIALOG_NUMPAD_SLOTS: Object.create(null),
};

const NUMPAD_KEY_MAP = Object.freeze(
  Object.assign(Object.create(null), {
    __NUMPAD_0__: "0",
    __NUMPAD_1__: "1",
    __NUMPAD_2__: "2",
    __NUMPAD_3__: "3",
    __NUMPAD_4__: "4",
    __NUMPAD_5__: "5",
    __NUMPAD_6__: "6",
    __NUMPAD_7__: "7",
    __NUMPAD_8__: "8",
    __NUMPAD_9__: "9",
    __NUMPAD_DECIMAL__: "decimal",
    __NUMPAD_BACKSPACE__: "backspace",
    __NUMPAD_TAB__: "tab",
  })
);

const PLUGIN_UUID = "com.ulanzi.ulanzistudio.freecad";
const WS_URL = "ws://127.0.0.1:19876";
const BRIDGE_FILES = ["InitGui.py", "ulanzi_bridge.py"];

const RECONNECT_MIN_MS = 2000;
const RECONNECT_MAX_MS = 15000;

const NEXT_PAGE_ICONS = Object.create(null);
for (const total of [2, 3]) {
  for (let pageNum = 1; pageNum <= total; pageNum += 1) {
    const rel = `resources/icons/next_page_${pageNum}_${total}.png`;
    if (fs.existsSync(path.join(PLUGIN_ROOT, rel))) {
      NEXT_PAGE_ICONS[`${pageNum}_${total}`] = rel;
    }
  }
}

const $UD = new UlanziApi();

let ws = null;
let wsConnected = false;
let reconnectTimer = null;
let reconnectDelayMs = RECONNECT_MIN_MS;
let hostConnected = false;
let currentWorkbench = "default";
let dialogActive = false;
let dialogDecimal = ".";

const workbenchPageIndex = Object.create(null);
const activeKeys = new Map();
let activeInspectorContext = null;

function isValidCommand(cmdId) {
  return typeof cmdId === "string" && Object.hasOwn(COMMANDS, cmdId);
}

function sanitizeCustomMap(rawCustom) {
  const clean = Object.create(null);
  if (!rawCustom || typeof rawCustom !== "object") return clean;

  for (const [wb, cmdId] of Object.entries(rawCustom)) {
    if (wb === "__proto__" || wb === "constructor" || wb === "prototype") continue;
    if (cmdId === "" || cmdId === "__SAME__" || isValidCommand(cmdId)) {
      clean[wb] = cmdId;
    }
  }
  return clean;
}

function getFreeCADBaseDir() {
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "FreeCAD");
  }
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "FreeCAD");
  }
  return path.join(os.homedir(), ".local", "share", "FreeCAD");
}

function getFreeCADAddonDirs() {
  const baseDir = getFreeCADBaseDir();
  const dirs = [];

  try {
    if (fs.existsSync(baseDir)) {
      const entries = fs.readdirSync(baseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && /^v\d+[-.]\d+/.test(entry.name)) {
          dirs.push(path.join(baseDir, entry.name, "Mod", "UlanziBridge"));
        }
      }
      if (fs.existsSync(path.join(baseDir, "Mod"))) {
        dirs.push(path.join(baseDir, "Mod", "UlanziBridge"));
      }
    }
  } catch {
    // fallback abaixo
  }

  if (dirs.length === 0) {
    dirs.push(path.join(baseDir, "Mod", "UlanziBridge"));
  }
  return [...new Set(dirs)];
}

function isBridgeInstalled() {
  try {
    return getFreeCADAddonDirs().some((dir) =>
      BRIDGE_FILES.every((file) => fs.existsSync(path.join(dir, file)))
    );
  } catch {
    return false;
  }
}

function installBridge() {
  const addonSrcDir = path.join(PLUGIN_ROOT, "resources", "freecad_addon");
  const missing = BRIDGE_FILES.filter((file) => !fs.existsSync(path.join(addonSrcDir, file)));
  if (missing.length > 0) {
    return {
      ok: false,
      message: `Arquivos da Bridge ausentes no plugin: ${missing.join(", ")}.`,
    };
  }

  const targetDirs = getFreeCADAddonDirs();
  try {
    for (const dir of targetDirs) {
      fs.mkdirSync(dir, { recursive: true });
      for (const file of BRIDGE_FILES) {
        fs.copyFileSync(path.join(addonSrcDir, file), path.join(dir, file));
      }
    }
    return {
      ok: true,
      message: `Bridge instalada com sucesso (${targetDirs.length} pasta(s) do FreeCAD). Reinicie o FreeCAD.`,
    };
  } catch (err) {
    return { ok: false, message: `Erro ao instalar Bridge: ${err.message}` };
  }
}

function hasValidContextParts(context) {
  if (typeof context !== "string" || !context) return false;
  const decoded = $UD.decodeContext(context);
  return Boolean(decoded?.uuid && (decoded?.key || decoded?.actionid));
}

function sendBridgeStatus(context, extraMessage, installedOverride) {
  if (!hasValidContextParts(context)) return;
  const installed = typeof installedOverride === "boolean" ? installedOverride : isBridgeInstalled();

  $UD.sendToPropertyInspector(
    {
      bridgeStatus: {
        connected: wsConnected,
        installed,
        workbench: currentWorkbench,
        message: extraMessage || undefined,
      },
    },
    context
  );
}

function broadcastBridgeStatus(extraMessage) {
  if (!activeInspectorContext) return;
  sendBridgeStatus(activeInspectorContext, extraMessage);
}

function normalizeSlot(slot) {
  const n = Number(slot);
  if (!Number.isInteger(n) || n < 1) return 1;
  return ((n - 1) % 13) + 1;
}

function extractAutoSlot(context, fallbackSlot) {
  const safeFallback = normalizeSlot(fallbackSlot);
  try {
    const decoded = $UD.decodeContext(context);
    const rawKey = String(decoded?.key ?? "").trim();
    if (!rawKey) return safeFallback;

    if (rawKey.includes("_")) {
      const parts = rawKey.split("_");
      if (parts.length === 2 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
        const col = Number(parts[0]);
        const row = Number(parts[1]);
        // Padrão Ulanzi D200X confirmado pelo perfil exportado: col_row (0..4 x 0..2)
        const slot = col <= 4 && row <= 2 ? row * 5 + col + 1 : -1;
        return slot >= 1 && slot <= 13 ? slot : safeFallback;
      }
    }

    if (/^\d+$/.test(rawKey)) {
      const parsed = Number(rawKey);
      return parsed === 0 ? 1 : parsed <= 13 ? parsed : (parsed % 13) + 1;
    }
  } catch {
    // fallback
  }
  return safeFallback;
}

function getPagesForWorkbench(wb) {
  if (typeof wb === "string" && Object.hasOwn(WORKBENCH_PAGES, wb)) {
    return WORKBENCH_PAGES[wb];
  }
  return WORKBENCH_PAGES.default || [{ name: "Default", slots: Object.create(null) }];
}

function getCurrentPage(wb) {
  const pages = getPagesForWorkbench(wb);
  const idx = Object.hasOwn(workbenchPageIndex, wb) ? workbenchPageIndex[wb] : 0;
  return { pages, idx: idx % pages.length, page: pages[idx % pages.length] };
}

function resolveCommandForKey(state) {
  if (dialogActive) {
    return Object.hasOwn(DIALOG_NUMPAD_SLOTS, state.autoSlot)
      ? DIALOG_NUMPAD_SLOTS[state.autoSlot]
      : "";
  }
  if (state.mode === "custom") {
    const chosen = Object.hasOwn(state.custom, currentWorkbench)
      ? state.custom[currentWorkbench]
      : undefined;
    if (chosen === "__SAME__" || chosen === undefined) {
      return Object.hasOwn(state.custom, "default") ? state.custom.default : "";
    }
    return chosen;
  }
  const { page } = getCurrentPage(currentWorkbench);
  return Object.hasOwn(page.slots, state.autoSlot) ? page.slots[state.autoSlot] : "";
}

function updateKeyVisual(context, force = false) {
  const state = activeKeys.get(context);
  if (!state) return;

  const cmdId = resolveCommandForKey(state);
  let icon = "resources/icon.png";
  let title = "";

  if (isValidCommand(cmdId)) {
    const info = COMMANDS[cmdId];
    icon = info.icon;
    title = info.shortTitle || "";

    if (cmdId === "__NEXT_PAGE__") {
      const { pages, idx, page } = getCurrentPage(currentWorkbench);
      const pageKey = `${idx + 1}_${pages.length}`;
      if (Object.hasOwn(NEXT_PAGE_ICONS, pageKey)) {
        icon = NEXT_PAGE_ICONS[pageKey];
      }
      title = `${page.name} ${idx + 1}/${pages.length}`;
    } else if (cmdId === "__NUMPAD_DECIMAL__") {
      icon = dialogDecimal === "," && info.commaIcon ? info.commaIcon : info.icon;
    }
  }

  const renderSignature = `${icon}|${title}`;
  if (!force && state.lastRendered === renderSignature) {
    return;
  }

  state.lastRendered = renderSignature;
  $UD.setPathIcon(context, icon, title);
}

function refreshAllKeys(force = false) {
  for (const context of activeKeys.keys()) {
    updateKeyVisual(context, force);
  }
}

function cyclePage() {
  const pages = getPagesForWorkbench(currentWorkbench);
  if (pages.length <= 1) return;
  const currentIdx = Object.hasOwn(workbenchPageIndex, currentWorkbench)
    ? workbenchPageIndex[currentWorkbench]
    : 0;
  workbenchPageIndex[currentWorkbench] = (currentIdx + 1) % pages.length;
  refreshAllKeys();
}

function scheduleReconnectFreeCAD() {
  if (!hostConnected || reconnectTimer) return;
  const delay = reconnectDelayMs;
  reconnectDelayMs = Math.min(reconnectDelayMs * 2, RECONNECT_MAX_MS);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectFreeCAD();
  }, delay);
}

function triggerImmediateReconnect() {
  if (!hostConnected || wsConnected) return;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectDelayMs = RECONNECT_MIN_MS;
  connectFreeCAD();
}

function disconnectFreeCAD() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    const socket = ws;
    ws = null;
    try {
      socket.terminate();
    } catch {
      // ignore close errors
    }
  }
  wsConnected = false;
  if (dialogActive) {
    dialogActive = false;
    refreshAllKeys();
  }
}

function connectFreeCAD() {
  if (!hostConnected) return;
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  let socket;
  try {
    socket = new WebSocket(WS_URL, { maxPayload: 65536, handshakeTimeout: 3000 });
  } catch {
    scheduleReconnectFreeCAD();
    return;
  }

  ws = socket;

  socket.on("open", () => {
    if (socket !== ws) return;
    wsConnected = true;
    reconnectDelayMs = RECONNECT_MIN_MS;
    $UD.logMessage("[FreeCAD] Conectado à Bridge", "info");
    broadcastBridgeStatus();
  });

  socket.on("message", (data) => {
    if (socket !== ws) return;
    try {
      const msg = JSON.parse(data.toString());
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "workbench" && typeof msg.name === "string" && msg.name) {
        if (msg.name !== currentWorkbench) {
          currentWorkbench = msg.name;
          workbenchPageIndex[currentWorkbench] = 0;
          refreshAllKeys();
          broadcastBridgeStatus();
        }
        return;
      }

      if (msg.type === "dialog") {
        const nextActive = Boolean(msg.active);
        const nextDecimal = msg.decimal === "," ? "," : ".";
        if (nextActive !== dialogActive || nextDecimal !== dialogDecimal) {
          dialogActive = nextActive;
          dialogDecimal = nextDecimal;
          refreshAllKeys();
        }
        return;
      }

      if (msg.type === "sketchSelection") {
        if (currentWorkbench === "SketcherWorkbench") {
          const pages = getPagesForWorkbench("SketcherWorkbench");
          const currentPage = workbenchPageIndex.SketcherWorkbench || 0;
          if (msg.hasGeometry) {
            // Se estava na pág. de desenho (0), vai para Constr (1); se já estava em Constr/Tools (1/2), mantém
            if (currentPage === 0 && pages.length > 1) {
              workbenchPageIndex.SketcherWorkbench = 1;
              if (!dialogActive) {
                refreshAllKeys();
              }
            }
          } else if (currentPage !== 0) {
            workbenchPageIndex.SketcherWorkbench = 0;
            if (!dialogActive) {
              refreshAllKeys();
            }
          }
        }
      }
    } catch (err) {
      $UD.logMessage(`[FreeCAD] Mensagem inválida: ${err.message}`, "error");
    }
  });

  socket.on("close", () => {
    if (socket !== ws) return;
    wsConnected = false;
    ws = null;
    if (dialogActive) {
      dialogActive = false;
      refreshAllKeys();
    }
    broadcastBridgeStatus();
    scheduleReconnectFreeCAD();
  });

  socket.on("error", () => {
    if (socket !== ws) return;
    if (socket.readyState !== WebSocket.CLOSING && socket.readyState !== WebSocket.CLOSED) {
      socket.terminate();
    }
  });
}

function sendWsPayload(payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    $UD.toast("FreeCAD não conectado");
    triggerImmediateReconnect();
    return;
  }
  try {
    ws.send(JSON.stringify(payload));
  } catch (err) {
    $UD.logMessage(`[FreeCAD] Falha ao enviar mensagem: ${err.message}`, "error");
    triggerImmediateReconnect();
  }
}

function sendCommand(command) {
  if (!isValidCommand(command) || command === "__NEXT_PAGE__" || Object.hasOwn(NUMPAD_KEY_MAP, command)) {
    return;
  }
  sendWsPayload({ type: "runCommand", command });
}

function sendDialogKey(key) {
  sendWsPayload({ type: "dialogKey", key });
}

function upsertKeyState(ctx, param, { replaceCustom = false, forceRender = false } = {}) {
  if (!ctx) return;
  const prev = activeKeys.get(ctx);
  const autoSlot = prev?.autoSlot ?? extractAutoSlot(ctx, activeKeys.size + 1);
  const p = param && typeof param === "object" ? param : {};
  const mode = p.mode === "custom" ? "custom" : p.mode === "auto" ? "auto" : prev?.mode || "auto";

  let custom;
  if (p.custom && typeof p.custom === "object") {
    const incoming = sanitizeCustomMap(p.custom);
    custom = replaceCustom
      ? incoming
      : Object.assign(Object.create(null), prev?.custom || {}, incoming);
  } else {
    custom = prev?.custom || Object.create(null);
  }

  activeKeys.set(ctx, {
    autoSlot,
    mode,
    custom,
    lastRendered: prev?.lastRendered || "",
  });
  updateKeyVisual(ctx, forceRender);
}

$UD.connect(PLUGIN_UUID);

$UD.onConnected(() => {
  hostConnected = true;
  reconnectDelayMs = RECONNECT_MIN_MS;
  $UD.logMessage("[FreeCAD] Conectado ao UlanziStudio", "info");
  connectFreeCAD();
});

$UD.onClose(() => {
  hostConnected = false;
  disconnectFreeCAD();
});

$UD.onError((err) => {
  $UD.logMessage(`[FreeCAD] Erro de conexão com UlanziStudio: ${err}`, "error");
});

$UD.onAdd((message) => {
  upsertKeyState(message.context, message.param, { forceRender: true });
});

$UD.onParamFromApp((message) => {
  upsertKeyState(message.context, message.param);
});

$UD.onParamFromPlugin((message) => {
  if (message?.param && (message.param.mode || message.param.custom)) {
    upsertKeyState(message.context, message.param, { replaceCustom: true });
  }
});

$UD.onSetActive((message) => {
  const ctx = message?.context;
  if (!ctx) return;
  if (message.active !== false) {
    if (!activeKeys.has(ctx) || message.param) {
      upsertKeyState(ctx, message.param, { forceRender: true });
    } else {
      updateKeyVisual(ctx, true);
    }
  }
});

$UD.onRun((message) => {
  const state = activeKeys.get(message.context);
  if (!state) return;

  const cmdId = resolveCommandForKey(state);
  if (Object.hasOwn(NUMPAD_KEY_MAP, cmdId)) {
    sendDialogKey(NUMPAD_KEY_MAP[cmdId]);
  } else if (cmdId === "__NEXT_PAGE__") {
    cyclePage();
  } else if (isValidCommand(cmdId)) {
    sendCommand(cmdId);
  }
});

$UD.onClear((message) => {
  if (Array.isArray(message.param)) {
    for (const item of message.param) {
      if (item?.context) {
        activeKeys.delete(item.context);
        if (activeInspectorContext === item.context) {
          activeInspectorContext = null;
        }
      }
    }
  }
});

$UD.onSendToPlugin((message) => {
  const ctx = message.context;
  const data = message?.payload || message?.param || message;
  if (!data || typeof data !== "object") return;

  if (hasValidContextParts(ctx)) {
    activeInspectorContext = ctx;
  }

  if (data.action === "installBridge") {
    const res = installBridge();
    sendBridgeStatus(ctx, res.message);
    if (res.ok) $UD.toast("Bridge do FreeCAD instalada");
    return;
  }

  if (data.action === "getBridgeStatus") {
    if (!wsConnected) triggerImmediateReconnect();
    sendBridgeStatus(ctx);
    return;
  }

  if (data.action === "updateSettings" && data.settings) {
    upsertKeyState(ctx, data.settings, { replaceCustom: true });
  }
});
