import base64
import hashlib
import importlib
import json
import re
import struct
import FreeCAD  # type: ignore
import FreeCADGui  # type: ignore

try:
    from PySide import QtCore, QtGui, QtNetwork, QtWidgets  # type: ignore
except ImportError:
    try:
        from PySide6 import QtCore, QtGui, QtNetwork, QtWidgets  # type: ignore
    except ImportError:
        from PySide import QtCore, QtGui, QtNetwork  # type: ignore
        QtWidgets = QtGui  # type: ignore

WS_PORT = 19876
WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
MAX_CLIENTS = 8
MAX_HANDSHAKE_BYTES = 8192
MAX_FRAME_BYTES = 65536
MAX_BUFFER_BYTES = 131072
DIALOG_POLL_MS = 250
ACTION_CHECK_DELAY_MS = 80
SELECTION_DEBOUNCE_MS = 25

CMD_NAME_RE = re.compile(r"^[A-Za-z0-9_]{1,100}$")
WS_KEY_RE = re.compile(r"^[A-Za-z0-9+/=]{16,64}$")
DECIMAL_COMMA_RE = re.compile(r"\d,\d")
DECIMAL_DOT_RE = re.compile(r"\d\.\d")

ALLOWED_DIALOG_KEYS = frozenset(
    {"0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "decimal", "backspace", "tab"}
)
COMMAND_DISPATCH_OVERRIDES = {
    # FreeCAD 1.0/1.1+ unificou Coincident + PointOnObject no atalho "C" (Sketcher_ConstrainCoincidentUnified)
    "Sketcher_ConstrainCoincident": (
        ("Sketcher_ConstrainCoincidentUnified", None),
        ("Sketcher_ConstrainCoincident", None),
    ),
    # FreeCAD 1.1+ renomeou Sketcher_External para Sketcher_Projection
    "Sketcher_External": (
        ("Sketcher_Projection", None),
        ("Sketcher_External", None),
    ),
    # StdPerspectiveCamera / StdOrthographicCamera exigem iMsg == 1 em activated(int)
    "Std_PerspectiveCamera": (("Std_PerspectiveCamera", 1),),
    "Std_OrthographicCamera": (("Std_OrthographicCamera", 1),),
    # Std_DrawStyle é um CommandGroup 0-based: 2 = Wireframe, 6 = Flat Lines
    "Std_DrawStyleWireFrame": (("Std_DrawStyle", 2),),
    "Std_DrawStyleFlatLines": (("Std_DrawStyle", 6),),
}
COMMAND_MODULE_PREFIXES = (
    ("Spreadsheet_", "SpreadsheetGui"),
    ("PartDesign_", "PartDesignGui"),
    ("Sketcher_", "SketcherGui"),
    ("Part_", "PartGui"),
)
SKETCH_GEOMETRY_PREFIXES = (
    "edge",
    "vertex",
    "externaledge",
    "h_axis",
    "v_axis",
    "rootpoint",
)
IGNORED_DIALOG_TYPES = tuple(
    cls
    for cls in (
        getattr(QtWidgets, "QFileDialog", None),
        getattr(QtWidgets, "QMessageBox", None),
        getattr(QtWidgets, "QColorDialog", None),
        getattr(QtWidgets, "QFontDialog", None),
        getattr(QtWidgets, "QProgressDialog", None),
    )
    if cls is not None
)
_BRIDGE = None


def _ws_encode_text(text: str) -> bytes:
    data = text.encode("utf-8")
    n = len(data)
    if n < 126:
        header = bytes([0x81, n])
    elif n < 65536:
        header = b"\x81\x7e" + struct.pack("!H", n)
    else:
        header = b"\x81\x7f" + struct.pack("!Q", n)
    return header + data


def _qt_key_for_char(char: str):
    key_map = {
        "0": QtCore.Qt.Key_0,
        "1": QtCore.Qt.Key_1,
        "2": QtCore.Qt.Key_2,
        "3": QtCore.Qt.Key_3,
        "4": QtCore.Qt.Key_4,
        "5": QtCore.Qt.Key_5,
        "6": QtCore.Qt.Key_6,
        "7": QtCore.Qt.Key_7,
        "8": QtCore.Qt.Key_8,
        "9": QtCore.Qt.Key_9,
        ".": QtCore.Qt.Key_Period,
        ",": QtCore.Qt.Key_Comma,
    }
    return key_map.get(char, 0)


def _is_usable_input(widget) -> bool:
    if widget is None:
        return False
    try:
        if not widget.isVisible() or not widget.isEnabled():
            return False
        if hasattr(widget, "isReadOnly") and widget.isReadOnly():
            return False
        return True
    except Exception:
        return False


def _is_input_widget(widget) -> bool:
    return widget is not None and isinstance(widget, (QtWidgets.QAbstractSpinBox, QtWidgets.QLineEdit))


def _is_descendant(widget, ancestor) -> bool:
    cur = widget
    while cur is not None:
        if cur is ancestor:
            return True
        cur = cur.parent() if hasattr(cur, "parent") else None
    return False


def _is_loopback_host(host_header: str) -> bool:
    if not host_header:
        return True
    host = host_header.strip().lower()
    return (
        host == "127.0.0.1"
        or host.startswith("127.0.0.1:")
        or host == "localhost"
        or host.startswith("localhost:")
        or host == "[::1]"
        or host.startswith("[::1]:")
    )


class _SelectionObserver:
    def __init__(self, bridge):
        self._bridge = bridge

    def addSelection(self, _doc, _obj, _sub, _pos):
        self._bridge._schedule_selection_check()

    def removeSelection(self, _doc, _obj, _sub):
        self._bridge._schedule_selection_check()

    def clearSelection(self, _doc):
        self._bridge._schedule_selection_check()

    def setSelection(self, _doc):
        self._bridge._schedule_selection_check()


class UlanziBridge(QtCore.QObject):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.server = QtNetwork.QTcpServer(self)
        self.clients = {}
        self._dialog_active = False
        self._dialog_decimal = self._default_decimal_separator()
        self._sketch_has_geometry = False
        self._sel_observer = None
        self._shutting_down = False

        if not self.server.listen(QtNetwork.QHostAddress("127.0.0.1"), WS_PORT):
            FreeCAD.Console.PrintError(
                f"[UlanziBridge] Falha ao abrir porta {WS_PORT}: {self.server.errorString()}\n"
            )
            return

        self.server.newConnection.connect(self._on_new_connection)
        self._mw_connected = False
        mw = FreeCADGui.getMainWindow()
        if mw and hasattr(mw, "workbenchActivated"):
            try:
                mw.workbenchActivated.connect(self._on_workbench_changed)
                self._mw_connected = True
            except Exception:
                pass

        # Timers em fila no event loop: nunca usa app.focusChanged (evita crash do PySide6/Qt6 no macOS)
        self._poll_timer = QtCore.QTimer(self)
        self._poll_timer.setInterval(DIALOG_POLL_MS)
        self._poll_timer.timeout.connect(self._poll_dialog_state)

        self._action_timer = QtCore.QTimer(self)
        self._action_timer.setSingleShot(True)
        self._action_timer.setInterval(ACTION_CHECK_DELAY_MS)
        self._action_timer.timeout.connect(self._poll_dialog_state)

        self._sel_timer = QtCore.QTimer(self)
        self._sel_timer.setSingleShot(True)
        self._sel_timer.setInterval(SELECTION_DEBOUNCE_MS)
        self._sel_timer.timeout.connect(self._on_selection_changed)

        try:
            if hasattr(FreeCADGui, "Selection") and hasattr(FreeCADGui.Selection, "addObserver"):
                self._sel_observer = _SelectionObserver(self)
                FreeCADGui.Selection.addObserver(self._sel_observer)
        except Exception:
            self._sel_observer = None

        app = QtWidgets.QApplication.instance()
        if app and hasattr(app, "aboutToQuit"):
            try:
                app.aboutToQuit.connect(self._on_about_to_quit)
            except Exception:
                pass

        FreeCAD.Console.PrintMessage(
            f"[UlanziBridge] Servidor ativo em ws://127.0.0.1:{WS_PORT}\n"
        )

    def _on_about_to_quit(self):
        self._shutting_down = True
        for timer in (self._poll_timer, self._action_timer, self._sel_timer):
            try:
                timer.stop()
            except Exception:
                pass
        if self._mw_connected:
            try:
                mw = FreeCADGui.getMainWindow()
                if mw and hasattr(mw, "workbenchActivated"):
                    mw.workbenchActivated.disconnect(self._on_workbench_changed)
            except Exception:
                pass
            self._mw_connected = False
        if self._sel_observer is not None:
            try:
                FreeCADGui.Selection.removeObserver(self._sel_observer)
            except Exception:
                pass
            self._sel_observer = None
        for sock in list(self.clients.keys()):
            try:
                sock.readyRead.disconnect(self._on_ready_read)
            except Exception:
                pass
            try:
                sock.disconnected.disconnect(self._on_disconnected)
            except Exception:
                pass
            try:
                if hasattr(sock, "abort"):
                    sock.abort()
                else:
                    sock.close()
            except Exception:
                pass
        self.clients.clear()
        try:
            self.server.close()
        except Exception:
            pass
        # Não zera _BRIDGE aqui para não destruir QTcpServer/QTcpSocket enquanto houver DeferredDelete pendente na fila do Qt

    def _has_active_clients(self) -> bool:
        return not self._shutting_down and any(st.get("handshake") for st in self.clients.values())

    def _sync_poll_timer(self):
        if not hasattr(self, "_poll_timer"):
            return
        if self._has_active_clients():
            if not self._poll_timer.isActive():
                self._poll_timer.start()
        elif self._poll_timer.isActive():
            self._poll_timer.stop()

    def _current_workbench(self) -> str:
        wb = FreeCADGui.activeWorkbench()
        if not wb:
            return "StartWorkbench"
        return wb.name() if hasattr(wb, "name") else wb.__class__.__name__

    def _default_decimal_separator(self) -> str:
        try:
            dp = QtCore.QLocale().decimalPoint()
            if isinstance(dp, str) and dp:
                return "," if dp[0] == "," else "."
        except Exception:
            pass
        return "."

    def _find_task_view_widgets(self):
        mw = FreeCADGui.getMainWindow()
        if not mw:
            return []
        candidates = []
        # Restringe a busca aos docks de Tasks/ComboView para nunca tocar StartView/NewFileButton no PySide6
        search_roots = []
        dock_cls = getattr(QtWidgets, "QDockWidget", None)
        if dock_cls is not None:
            try:
                for dock in mw.findChildren(dock_cls):
                    if not dock.isVisible():
                        continue
                    name = (dock.objectName() if hasattr(dock, "objectName") else "").lower()
                    if "task" in name or "combo" in name:
                        search_roots.append(dock)
            except Exception:
                pass
        if not search_roots:
            search_roots = [mw]

        try:
            for root in search_roots:
                for box in root.findChildren(QtWidgets.QDialogButtonBox):
                    if not box.isVisible():
                        continue
                    parent = box.parentWidget() if hasattr(box, "parentWidget") else box.parent()
                    container = parent
                    while container is not None and container is not mw:
                        cls_name = container.__class__.__name__
                        obj_name = container.objectName() if hasattr(container, "objectName") else ""
                        if "Task" in cls_name or "Task" in obj_name:
                            break
                        nxt = container.parentWidget() if hasattr(container, "parentWidget") else container.parent()
                        if nxt is None or nxt is mw:
                            break
                        container = nxt
                    candidates.append((container or parent or box, box))
        except Exception:
            pass
        return candidates

    def _has_ok_or_apply_button(self, box) -> bool:
        try:
            for flag in (QtWidgets.QDialogButtonBox.Ok, QtWidgets.QDialogButtonBox.Apply):
                btn = box.button(flag)
                if btn is not None and btn.isVisible():
                    return True
        except Exception:
            pass
        return False

    def _find_input_widget(self, container):
        try:
            fw = QtWidgets.QApplication.focusWidget()
            if _is_input_widget(fw) and _is_usable_input(fw):
                if container is None or _is_descendant(fw, container):
                    return fw
        except Exception:
            pass

        if container is None:
            return None

        try:
            for spin in container.findChildren(QtWidgets.QAbstractSpinBox):
                if _is_usable_input(spin):
                    return spin
            for edit in container.findChildren(QtWidgets.QLineEdit):
                if _is_usable_input(edit):
                    return edit
        except Exception:
            pass
        return None

    def _get_active_dialog_context(self):
        if self._shutting_down:
            return (None, None, None)

        # 1. Modal QDialog (ex.: Insert length no Sketcher, Placement, etc.)
        modal = None
        try:
            cand = QtWidgets.QApplication.activeModalWidget()
            if cand is None:
                win = QtWidgets.QApplication.activeWindow()
                mw = FreeCADGui.getMainWindow()
                if win is not None and win is not mw and isinstance(win, QtWidgets.QDialog):
                    cand = win
            if cand is not None and cand.isVisible() and isinstance(cand, QtWidgets.QDialog):
                if not (IGNORED_DIALOG_TYPES and isinstance(cand, IGNORED_DIALOG_TYPES)):
                    if self._find_input_widget(cand) is not None:
                        modal = cand
        except Exception:
            modal = None

        if modal is not None:
            return ("modal", modal, None)

        # 2. Task Panel do FreeCAD (ex.: Pad, Pocket, Chamfer, Fillet, Hole, Revolution...)
        # No Sketcher, o TaskDlgEditSketch fica aberto o tempo todo (só Close) — pula findChildren
        if self._current_workbench() == "SketcherWorkbench":
            return (None, None, None)

        try:
            has_task = bool(FreeCADGui.Control.activeDialog())
        except Exception:
            has_task = False

        if not has_task:
            return (None, None, None)

        task_boxes = self._find_task_view_widgets()
        for container, box in task_boxes:
            if self._has_ok_or_apply_button(box):
                return ("task", container, box)

        for container, box in task_boxes:
            if self._find_input_widget(container) is not None:
                return ("task", container, box)

        mw = FreeCADGui.getMainWindow()
        return ("task", mw, None)

    def _detect_decimal_separator(self, container) -> str:
        widget = self._find_input_widget(container)
        if widget is not None:
            try:
                text = ""
                if isinstance(widget, QtWidgets.QAbstractSpinBox):
                    le = widget.lineEdit() if hasattr(widget, "lineEdit") else None
                    text = le.text() if le is not None else widget.text()
                elif isinstance(widget, QtWidgets.QLineEdit):
                    text = widget.text()

                stripped = text.strip()
                if stripped.startswith("="):
                    return "."
                if DECIMAL_COMMA_RE.search(stripped):
                    return ","
                if DECIMAL_DOT_RE.search(stripped):
                    return "."
            except Exception:
                pass

            try:
                if hasattr(widget, "locale"):
                    dp = widget.locale().decimalPoint()
                    if isinstance(dp, str) and dp:
                        return "," if dp[0] == "," else "."
            except Exception:
                pass

        return self._default_decimal_separator()

    def _refresh_dialog_state(self, broadcast: bool = True):
        if self._shutting_down:
            return
        kind, container, _ = self._get_active_dialog_context()
        active = kind is not None
        decimal = self._detect_decimal_separator(container) if active else self._dialog_decimal

        if active != self._dialog_active or (active and decimal != self._dialog_decimal):
            self._dialog_active = active
            self._dialog_decimal = decimal
            if broadcast:
                self._broadcast_dialog_state()

    def _poll_dialog_state(self):
        if not self._has_active_clients():
            self._sync_poll_timer()
            return
        self._refresh_dialog_state(broadcast=True)

    def _schedule_selection_check(self):
        if not self._has_active_clients():
            return
        self._sel_timer.start()

    def _has_sketch_geometry_selected(self) -> bool:
        if self._current_workbench() != "SketcherWorkbench":
            return False
        try:
            selection = FreeCADGui.Selection.getSelectionEx()
        except Exception:
            return False

        for sel in selection:
            sub_names = getattr(sel, "SubElementNames", ()) or ()
            for sub in sub_names:
                if not isinstance(sub, str) or not sub:
                    continue
                leaf = sub.rsplit(".", 1)[-1].lower()
                if leaf.startswith(SKETCH_GEOMETRY_PREFIXES):
                    return True
        return False

    def _on_selection_changed(self):
        if not self._has_active_clients():
            return
        has_geo = self._has_sketch_geometry_selected()
        if has_geo != self._sketch_has_geometry:
            self._sketch_has_geometry = has_geo
            self._broadcast_sketch_selection()

    def _broadcast_sketch_selection(self):
        payload = {"type": "sketchSelection", "hasGeometry": self._sketch_has_geometry}
        for sock in list(self.clients.keys()):
            self._send_json(sock, payload)

    def _broadcast_dialog_state(self):
        payload = {
            "type": "dialog",
            "active": self._dialog_active,
            "decimal": self._dialog_decimal,
        }
        for sock in list(self.clients.keys()):
            self._send_json(sock, payload)

    def _find_all_input_widgets(self, container):
        if container is None:
            return []
        inputs = []
        seen = set()
        try:
            spinboxes = [s for s in container.findChildren(QtWidgets.QAbstractSpinBox) if _is_usable_input(s)]
            spin_line_edits = set()
            for s in spinboxes:
                seen.add(id(s))
                inputs.append(s)
                le = s.lineEdit() if hasattr(s, "lineEdit") else None
                if le is not None:
                    spin_line_edits.add(id(le))

            for edit in container.findChildren(QtWidgets.QLineEdit):
                if id(edit) in spin_line_edits or id(edit) in seen:
                    continue
                if _is_usable_input(edit):
                    seen.add(id(edit))
                    inputs.append(edit)
        except Exception:
            pass
        return inputs

    def _cycle_input_field(self, container):
        inputs = self._find_all_input_widgets(container)
        if len(inputs) > 1:
            fw = None
            try:
                fw = QtWidgets.QApplication.focusWidget()
            except Exception:
                fw = None

            cur_idx = -1
            for i, w in enumerate(inputs):
                if w is fw or (
                    isinstance(w, QtWidgets.QAbstractSpinBox)
                    and hasattr(w, "lineEdit")
                    and w.lineEdit() is fw
                ):
                    cur_idx = i
                    break

            nxt = inputs[(cur_idx + 1) % len(inputs)]
            try:
                nxt.setFocus()
                if hasattr(nxt, "selectAll"):
                    nxt.selectAll()
                elif isinstance(nxt, QtWidgets.QAbstractSpinBox) and hasattr(nxt, "lineEdit") and nxt.lineEdit():
                    nxt.lineEdit().selectAll()
            except Exception:
                pass
            self._refresh_dialog_state(broadcast=True)
            return

        target = None
        try:
            target = QtWidgets.QApplication.focusWidget()
        except Exception:
            target = None
        if target is None:
            target = self._find_input_widget(container) or container
        if target is not None:
            try:
                self._send_qt_key(target, QtCore.Qt.Key_Tab, "\t")
            except Exception:
                pass
        self._refresh_dialog_state(broadcast=True)

    def _send_qt_key(self, target, qt_key, text: str = ""):
        press = QtGui.QKeyEvent(QtCore.QEvent.KeyPress, qt_key, QtCore.Qt.NoModifier, text)
        release = QtGui.QKeyEvent(QtCore.QEvent.KeyRelease, qt_key, QtCore.Qt.NoModifier, text)
        QtWidgets.QApplication.sendEvent(target, press)
        QtWidgets.QApplication.sendEvent(target, release)

    def _send_key_to_widget(self, target, char: str):
        self._send_qt_key(target, _qt_key_for_char(char), char)

    def _commit_active_input(self, container):
        widget = self._find_input_widget(container)
        if widget is None:
            return
        try:
            parent = widget.parentWidget() if hasattr(widget, "parentWidget") else None
            spin = widget if isinstance(widget, QtWidgets.QAbstractSpinBox) else (
                parent if isinstance(parent, QtWidgets.QAbstractSpinBox) else None
            )
            if spin is not None and hasattr(spin, "interpretText"):
                spin.interpretText()
        except Exception:
            pass

    def _handle_dialog_key(self, key: str):
        kind, container, _ = self._get_active_dialog_context()
        if kind is None:
            self._refresh_dialog_state(broadcast=True)
            return

        if key == "tab":
            self._commit_active_input(container)
            self._cycle_input_field(container)
            return

        widget = self._find_input_widget(container)
        if widget is None:
            return

        if key == "backspace":
            try:
                had_focus = widget.hasFocus()
                target = widget
                if isinstance(widget, QtWidgets.QAbstractSpinBox):
                    le = widget.lineEdit() if hasattr(widget, "lineEdit") else None
                    if le is not None:
                        had_focus = had_focus or le.hasFocus()
                        target = le
                if not had_focus:
                    widget.setFocus()
                self._send_qt_key(target, QtCore.Qt.Key_Backspace, "\b")
            except Exception as err:
                FreeCAD.Console.PrintWarning(f"[UlanziBridge] Erro ao enviar tecla 'backspace': {err}\n")
            return

        # Dígito 0-9 ou separador decimal
        char = self._detect_decimal_separator(container) if key == "decimal" else key
        try:
            had_focus = widget.hasFocus()
            target = widget
            if isinstance(widget, QtWidgets.QAbstractSpinBox):
                le = widget.lineEdit() if hasattr(widget, "lineEdit") else None
                if le is not None:
                    had_focus = had_focus or le.hasFocus()
                    target = le

            if not had_focus:
                widget.setFocus()
                if hasattr(widget, "selectAll"):
                    widget.selectAll()
                elif hasattr(target, "selectAll"):
                    target.selectAll()

            self._send_key_to_widget(target, char)
        except Exception as err:
            FreeCAD.Console.PrintWarning(f"[UlanziBridge] Erro ao enviar tecla '{key}': {err}\n")

    def _on_new_connection(self):
        if self._shutting_down:
            return
        while self.server.hasPendingConnections():
            sock = self.server.nextPendingConnection()
            if len(self.clients) >= MAX_CLIENTS:
                sock.close()
                sock.deleteLater()
                continue
            self.clients[sock] = {"handshake": False, "buf": bytearray()}
            sock.readyRead.connect(self._on_ready_read)
            sock.disconnected.connect(self._on_disconnected)

    def _on_disconnected(self, sock=None):
        if sock is None:
            sock = self.sender()
        if sock is None:
            return
        self.clients.pop(sock, None)
        try:
            sock.readyRead.disconnect(self._on_ready_read)
        except Exception:
            pass
        try:
            sock.disconnected.disconnect(self._on_disconnected)
        except Exception:
            pass
        if not self._shutting_down:
            sock.deleteLater()
            self._sync_poll_timer()

    def _reject_http(self, sock, status_line: str):
        try:
            sock.write(f"HTTP/1.1 {status_line}\r\nConnection: close\r\n\r\n".encode("ascii"))
            sock.flush()
        except Exception:
            pass
        sock.close()

    def _on_ready_read(self, sock=None):
        if self._shutting_down:
            return
        if sock is None:
            sock = self.sender()
        state = self.clients.get(sock)
        if not state:
            return

        state["buf"].extend(bytes(sock.readAll()))
        if len(state["buf"]) > MAX_BUFFER_BYTES:
            sock.close()
            return

        if not state["handshake"]:
            sep = state["buf"].find(b"\r\n\r\n")
            if sep == -1:
                if len(state["buf"]) > MAX_HANDSHAKE_BYTES:
                    self._reject_http(sock, "431 Request Header Fields Too Large")
                return
            if sep > MAX_HANDSHAKE_BYTES:
                self._reject_http(sock, "431 Request Header Fields Too Large")
                return

            raw_headers = bytes(state["buf"][:sep]).decode("utf-8", errors="ignore")
            del state["buf"][: sep + 4]

            lines = raw_headers.split("\r\n")
            if not lines or not lines[0].startswith("GET "):
                self._reject_http(sock, "400 Bad Request")
                return

            ws_key = None
            is_upgrade = False
            has_origin = False
            host_header = ""
            for line in lines[1:]:
                if ":" not in line:
                    continue
                name, value = line.split(":", 1)
                lower_name = name.strip().lower()
                clean_val = value.strip()
                if lower_name == "sec-websocket-key":
                    ws_key = clean_val
                elif lower_name == "upgrade" and clean_val.lower() == "websocket":
                    is_upgrade = True
                elif lower_name == "origin":
                    has_origin = True
                elif lower_name == "host":
                    host_header = clean_val

            # Bloqueia CSWSH (navegadores sempre enviam Origin) e DNS rebinding (Host externo)
            if has_origin or not _is_loopback_host(host_header):
                self._reject_http(sock, "403 Forbidden")
                return

            if not ws_key or not WS_KEY_RE.fullmatch(ws_key) or not is_upgrade:
                self._reject_http(sock, "400 Bad Request")
                return

            accept = base64.b64encode(
                hashlib.sha1((ws_key + WS_GUID).encode("utf-8")).digest()
            ).decode("ascii")

            response = (
                "HTTP/1.1 101 Switching Protocols\r\n"
                "Upgrade: websocket\r\n"
                "Connection: Upgrade\r\n"
                f"Sec-WebSocket-Accept: {accept}\r\n\r\n"
            )
            sock.write(response.encode("ascii"))
            sock.flush()
            state["handshake"] = True
            self._sync_poll_timer()

            # Sincroniza estado inicial sem duplicar mensagens
            self._refresh_dialog_state(broadcast=False)
            self._sketch_has_geometry = self._has_sketch_geometry_selected()
            self._send_json(sock, {"type": "workbench", "name": self._current_workbench()})
            self._send_json(
                sock,
                {"type": "dialog", "active": self._dialog_active, "decimal": self._dialog_decimal},
            )
            self._send_json(
                sock,
                {"type": "sketchSelection", "hasGeometry": self._sketch_has_geometry},
            )

        self._parse_frames(sock, state)

    def _parse_frames(self, sock, state):
        buf = state["buf"]
        while len(buf) >= 2 and sock in self.clients:
            opcode = buf[0] & 0x0F
            masked = (buf[1] & 0x80) != 0
            length = buf[1] & 0x7F
            offset = 2

            # RFC 6455 §5.1: frames enviados pelo cliente devem ser mascarados
            if not masked:
                sock.close()
                return

            if length == 126:
                if len(buf) < 4:
                    return
                length = struct.unpack("!H", buf[2:4])[0]
                offset = 4
            elif length == 127:
                if len(buf) < 10:
                    return
                length = struct.unpack("!Q", buf[2:10])[0]
                offset = 10

            if length > MAX_FRAME_BYTES:
                sock.close()
                return

            mask_len = 4
            if len(buf) < offset + mask_len + length:
                return

            mask = buf[offset : offset + 4]
            payload = bytearray(buf[offset + mask_len : offset + mask_len + length])
            del buf[: offset + mask_len + length]

            for i in range(length):
                payload[i] ^= mask[i % 4]

            if opcode == 0x8:
                try:
                    if sock.state() == QtNetwork.QAbstractSocket.ConnectedState:
                        sock.write(b"\x88\x00")
                        sock.flush()
                except Exception:
                    pass
                sock.close()
                return
            if opcode == 0x9:
                # RFC 6455 §5.5: frames de controle não podem exceder 125 bytes
                if len(payload) > 125:
                    sock.close()
                    return
                try:
                    if sock.state() == QtNetwork.QAbstractSocket.ConnectedState:
                        sock.write(bytes([0x8A, len(payload)]) + bytes(payload))
                        sock.flush()
                except Exception:
                    pass
            elif opcode == 0x1:
                self._handle_message(payload.decode("utf-8", errors="ignore"))

    def _list_registered_commands(self):
        try:
            if hasattr(FreeCADGui, "listCommands"):
                return set(FreeCADGui.listCommands())
        except Exception:
            pass
        return None

    def _run_freecad_command(self, cmd: str):
        candidates = COMMAND_DISPATCH_OVERRIDES.get(cmd, ((cmd, None),))
        available = self._list_registered_commands()

        if available is not None and not any(name in available for name, _ in candidates):
            for prefix, mod_name in COMMAND_MODULE_PREFIXES:
                if cmd.startswith(prefix) or candidates[0][0].startswith(prefix):
                    try:
                        importlib.import_module(mod_name)
                        available = self._list_registered_commands()
                    except Exception:
                        pass
                    break

        target_cmd, arg = candidates[0]
        if available is not None:
            for name, opt_arg in candidates:
                if name in available:
                    target_cmd, arg = name, opt_arg
                    break

        if arg is None:
            FreeCADGui.runCommand(target_cmd)
        else:
            FreeCADGui.runCommand(target_cmd, arg)

    def _handle_message(self, raw_text: str):
        try:
            msg = json.loads(raw_text)
        except json.JSONDecodeError:
            return

        if not isinstance(msg, dict):
            return

        msg_type = msg.get("type")
        if msg_type == "runCommand":
            cmd = msg.get("command")
            if isinstance(cmd, str) and CMD_NAME_RE.fullmatch(cmd):
                try:
                    self._run_freecad_command(cmd)
                    self._action_timer.start()
                except Exception as err:
                    FreeCAD.Console.PrintWarning(
                        f"[UlanziBridge] Erro ao executar '{cmd}': {err}\n"
                    )
        elif msg_type == "dialogKey":
            key = msg.get("key")
            if isinstance(key, str) and key in ALLOWED_DIALOG_KEYS:
                self._handle_dialog_key(key)

    def _send_json(self, sock, payload):
        state = self.clients.get(sock)
        if not state or not state["handshake"]:
            return
        if sock.state() != QtNetwork.QAbstractSocket.ConnectedState:
            return
        try:
            sock.write(_ws_encode_text(json.dumps(payload)))
            sock.flush()
        except Exception:
            pass

    def _on_workbench_changed(self, wb_name: str):
        self._sketch_has_geometry = False
        if not self._has_active_clients():
            return
        payload = {"type": "workbench", "name": wb_name}
        for sock in list(self.clients.keys()):
            self._send_json(sock, payload)
        self._action_timer.start()
        self._sel_timer.start()


def start():
    global _BRIDGE
    if _BRIDGE is None:
        # parent=None e sem atributo em MainWindow evita teardown fora de ordem no PySide6 ao encerrar o FreeCAD
        _BRIDGE = UlanziBridge(None)


def schedule_start():
    QtCore.QTimer.singleShot(1500, start)
