(function (root, factory) {
  "use strict";
  const catalog = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = catalog;
  }
  if (root) {
    root.FREECAD_CATALOG = catalog;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function toFrozenMap(obj) {
    const out = Object.create(null);
    for (const [k, v] of Object.entries(obj)) {
      out[k] = Object.freeze(v);
    }
    return Object.freeze(out);
  }

  const COMMANDS = toFrozenMap({
    __NEXT_PAGE__: {
      label: "⟳ Próxima Página (FreeCAD)",
      group: "Especial",
      icon: "resources/icons/next_page.png",
      shortTitle: "Pág",
    },

    // --- Teclado Numérico (Diálogos) ---
    __NUMPAD_0__: { label: "Numpad 0", group: "Teclado Numérico", icon: "resources/icons/Numpad/numpad_0.png", shortTitle: "" },
    __NUMPAD_1__: { label: "Numpad 1", group: "Teclado Numérico", icon: "resources/icons/Numpad/numpad_1.png", shortTitle: "" },
    __NUMPAD_2__: { label: "Numpad 2", group: "Teclado Numérico", icon: "resources/icons/Numpad/numpad_2.png", shortTitle: "" },
    __NUMPAD_3__: { label: "Numpad 3", group: "Teclado Numérico", icon: "resources/icons/Numpad/numpad_3.png", shortTitle: "" },
    __NUMPAD_4__: { label: "Numpad 4", group: "Teclado Numérico", icon: "resources/icons/Numpad/numpad_4.png", shortTitle: "" },
    __NUMPAD_5__: { label: "Numpad 5", group: "Teclado Numérico", icon: "resources/icons/Numpad/numpad_5.png", shortTitle: "" },
    __NUMPAD_6__: { label: "Numpad 6", group: "Teclado Numérico", icon: "resources/icons/Numpad/numpad_6.png", shortTitle: "" },
    __NUMPAD_7__: { label: "Numpad 7", group: "Teclado Numérico", icon: "resources/icons/Numpad/numpad_7.png", shortTitle: "" },
    __NUMPAD_8__: { label: "Numpad 8", group: "Teclado Numérico", icon: "resources/icons/Numpad/numpad_8.png", shortTitle: "" },
    __NUMPAD_9__: { label: "Numpad 9", group: "Teclado Numérico", icon: "resources/icons/Numpad/numpad_9.png", shortTitle: "" },
    __NUMPAD_DECIMAL__: {
      label: "Decimal (. / ,)",
      group: "Teclado Numérico",
      icon: "resources/icons/Numpad/numpad_dot.png",
      commaIcon: "resources/icons/Numpad/numpad_comma.png",
      shortTitle: "",
    },
    __NUMPAD_BACKSPACE__: { label: "Apagar (Backspace)", group: "Teclado Numérico", icon: "resources/icons/Numpad/numpad_backspace.png", shortTitle: "" },
    __NUMPAD_TAB__: { label: "Alternar Campos (Tab)", group: "Teclado Numérico", icon: "resources/icons/Numpad/numpad_tab.png", shortTitle: "Tab" },

    // --- Core & View ---
    Std_ViewIsometric: { label: "Vista Isométrica", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/view-isometric.png", shortTitle: "Iso" },
    Std_ViewFitAll: { label: "Fit All (Enquadrar)", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/general_zoom-fit-best.png", shortTitle: "Fit" },
    Std_ViewFitSelection: { label: "Fit Selection", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/general_zoom-selection.png", shortTitle: "Fit Sel" },
    Std_ViewTop: { label: "Vista Topo", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/view-top.png", shortTitle: "Top" },
    Std_ViewFront: { label: "Vista Frontal", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/view-front.png", shortTitle: "Front" },
    Std_ViewRight: { label: "Vista Direita", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/view-right.png", shortTitle: "Right" },
    Std_ViewLeft: { label: "Vista Esquerda", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/view-left.png", shortTitle: "Left" },
    Std_ViewRear: { label: "Vista Traseira", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/view-rear.png", shortTitle: "Rear" },
    Std_ViewBottom: { label: "Vista Inferior", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/view-bottom.png", shortTitle: "Bottom" },
    Std_PerspectiveCamera: { label: "Câmera Perspectiva", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/view-perspective.png", shortTitle: "Persp" },
    Std_OrthographicCamera: { label: "Câmera Ortográfica", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/view-axonometric.png", shortTitle: "Ortho" },
    Std_Refresh: { label: "Recompute", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/view-refresh.png", shortTitle: "Recomp" },
    Std_New: { label: "Novo Documento", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/general_document-new.png", shortTitle: "New" },
    Std_Open: { label: "Abrir Documento", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/general_document-open.png", shortTitle: "Open" },
    Std_Import: { label: "Importar", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/general_Std_Import.png", shortTitle: "Import" },
    Std_Export: { label: "Exportar (STEP/STL)", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/general_Std_Export.png", shortTitle: "Export" },
    Std_ToggleClipPlane: { label: "Plano de Corte (Clip)", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/general_Std_ToggleClipPlane.png", shortTitle: "Clip" },
    Std_ToggleTransparency: { label: "Alternar Transparência", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/general_Std_ToggleTransparency.png", shortTitle: "Transp" },
    Std_DrawStyleFlatLines: { label: "Estilo Flat Lines", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/general_DrawStyleFlatLines.png", shortTitle: "Flat" },
    Std_DrawStyleWireFrame: { label: "Estilo Wireframe", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/general_DrawStyleWireFrame.png", shortTitle: "Wire" },
    Std_VarSet: { label: "Novo VarSet", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/general_VarSet.png", shortTitle: "VarSet" },
    Spreadsheet_CreateSheet: { label: "Nova Planilha", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/general_Spreadsheet.png", shortTitle: "Sheet" },
    Std_Measure: { label: "Medir (Measure)", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/view-measurement.png", shortTitle: "Measure" },
    Std_TransformManip: { label: "Transformar", group: "Core & View", icon: "resources/icons/FreeCAD_Core_View/general_Std_TransformManip.png", shortTitle: "Transf" },

    // --- Part Design ---
    PartDesign_Body: { label: "New Body", group: "Part Design", icon: "resources/icons/FreeCAD_Part_Design/PartDesign_Body.png", shortTitle: "Body" },
    PartDesign_NewSketch: { label: "New Sketch", group: "Part Design", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_NewSketch.png", shortTitle: "Sketch" },
    PartDesign_Pad: { label: "Pad (Extrusão)", group: "Part Design", icon: "resources/icons/FreeCAD_Part_Design/PartDesign_Pad.png", shortTitle: "Pad" },
    PartDesign_Pocket: { label: "Pocket (Corte)", group: "Part Design", icon: "resources/icons/FreeCAD_Part_Design/PartDesign_Pocket.png", shortTitle: "Pocket" },
    PartDesign_Fillet: { label: "Fillet (Raio)", group: "Part Design", icon: "resources/icons/FreeCAD_Part_Design/PartDesign_Fillet.png", shortTitle: "Fillet" },
    PartDesign_Chamfer: { label: "Chamfer (Chanfro)", group: "Part Design", icon: "resources/icons/FreeCAD_Part_Design/PartDesign_Chamfer.png", shortTitle: "Chamfer" },
    PartDesign_Revolution: { label: "Revolution", group: "Part Design", icon: "resources/icons/FreeCAD_Part_Design/PartDesign_Revolution.png", shortTitle: "Revolve" },
    PartDesign_Groove: { label: "Groove", group: "Part Design", icon: "resources/icons/FreeCAD_Part_Design/PartDesign_Groove.png", shortTitle: "Groove" },
    PartDesign_Hole: { label: "Hole (Furo)", group: "Part Design", icon: "resources/icons/FreeCAD_Part_Design/PartDesign_Hole.png", shortTitle: "Hole" },
    PartDesign_Mirrored: { label: "Mirror (Espelhar)", group: "Part Design", icon: "resources/icons/FreeCAD_Part_Design/PartDesign_Mirrored.png", shortTitle: "Mirror" },
    PartDesign_LinearPattern: { label: "Linear Pattern", group: "Part Design", icon: "resources/icons/FreeCAD_Part_Design/PartDesign_LinearPattern.png", shortTitle: "Linear" },
    PartDesign_PolarPattern: { label: "Polar Pattern", group: "Part Design", icon: "resources/icons/FreeCAD_Part_Design/PartDesign_PolarPattern.png", shortTitle: "Polar" },
    PartDesign_MultiTransform: { label: "MultiTransform", group: "Part Design", icon: "resources/icons/FreeCAD_Part_Design/PartDesign_MultiTransform.png", shortTitle: "Multi" },
    PartDesign_Boolean: { label: "Boolean", group: "Part Design", icon: "resources/icons/FreeCAD_Part_Design/PartDesign_Boolean.png", shortTitle: "Bool" },
    PartDesign_ShapeBinder: { label: "ShapeBinder", group: "Part Design", icon: "resources/icons/FreeCAD_Part_Design/PartDesign_ShapeBinder.png", shortTitle: "Binder" },
    PartDesign_SubShapeBinder: { label: "SubShapeBinder", group: "Part Design", icon: "resources/icons/FreeCAD_Part_Design/PartDesign_SubShapeBinder.png", shortTitle: "SubBind" },
    PartDesign_AdditiveLoft: { label: "Additive Loft", group: "Part Design", icon: "resources/icons/FreeCAD_Part_Design/PartDesign_AdditiveLoft.png", shortTitle: "Loft" },
    PartDesign_AdditivePipe: { label: "Additive Pipe", group: "Part Design", icon: "resources/icons/FreeCAD_Part_Design/PartDesign_AdditivePipe.png", shortTitle: "Pipe" },
    PartDesign_AdditiveHelix: { label: "Additive Helix", group: "Part Design", icon: "resources/icons/FreeCAD_Part_Design/PartDesign_AdditiveHelix.png", shortTitle: "Helix" },
    PartDesign_Thickness: { label: "Thickness", group: "Part Design", icon: "resources/icons/FreeCAD_Part_Design/PartDesign_Thickness.png", shortTitle: "Thick" },
    PartDesign_Draft: { label: "Draft (Ângulo)", group: "Part Design", icon: "resources/icons/FreeCAD_Part_Design/PartDesign_Draft.png", shortTitle: "Draft" },
    PartDesign_Plane: { label: "Datum Plane", group: "Part Design", icon: "resources/icons/FreeCAD_Part_Design/PartDesign_Plane.png", shortTitle: "Plane" },
    PartDesign_Clone: { label: "Clone", group: "Part Design", icon: "resources/icons/FreeCAD_Part_Design/PartDesign_Clone.png", shortTitle: "Clone" },

    // --- Sketcher (Geometria) ---
    Sketcher_CreateLine: { label: "Line", group: "Sketcher", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_CreateLine.png", shortTitle: "Line" },
    Sketcher_CreatePolyline: { label: "Polyline", group: "Sketcher", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_CreatePolyline.png", shortTitle: "Poly" },
    Sketcher_CreateRectangle: { label: "Rectangle", group: "Sketcher", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_CreateRectangle.png", shortTitle: "Rect" },
    Sketcher_CreateRectangle_Center: { label: "Centered Rectangle", group: "Sketcher", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_CreateRectangle_Center.png", shortTitle: "Rect C" },
    Sketcher_CreateCircle: { label: "Circle", group: "Sketcher", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_CreateCircle.png", shortTitle: "Circle" },
    Sketcher_CreateArc: { label: "Arc", group: "Sketcher", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_CreateArc.png", shortTitle: "Arc" },
    Sketcher_CreateSlot: { label: "Slot", group: "Sketcher", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_CreateSlot.png", shortTitle: "Slot" },
    Sketcher_CreateFillet: { label: "Sketch Fillet", group: "Sketcher", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_CreateFillet.png", shortTitle: "Fillet" },
    Sketcher_CreateChamfer: { label: "Sketch Chamfer", group: "Sketcher", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_CreateChamfer.png", shortTitle: "Chamf" },
    Sketcher_Trimming: { label: "Trim", group: "Sketcher", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_Trimming.png", shortTitle: "Trim" },
    Sketcher_Extend: { label: "Extend", group: "Sketcher", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_Extend.png", shortTitle: "Extend" },
    Sketcher_Offset: { label: "Offset", group: "Sketcher", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_Offset.png", shortTitle: "Offset" },
    Sketcher_Translate: { label: "Translate / Array", group: "Sketcher", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_Translate.png", shortTitle: "Array" },
    Sketcher_Rotate: { label: "Rotate / Polar", group: "Sketcher", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_Rotate.png", shortTitle: "Rotate" },
    Sketcher_Scale: { label: "Scale", group: "Sketcher", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_Scale.png", shortTitle: "Scale" },
    Sketcher_Symmetry: { label: "Mirror (Symmetry)", group: "Sketcher", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_Symmetry.png", shortTitle: "Mirror" },
    Sketcher_RemoveAxesAlignment: { label: "Remove Axes Alignment", group: "Sketcher", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_RemoveAxesAlignment.png", shortTitle: "NoAxes" },
    Sketcher_External: { label: "External Geometry", group: "Sketcher", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_Projection.png", shortTitle: "Ext" },
    Sketcher_ToggleConstruction: { label: "Construction Mode", group: "Sketcher", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_ToggleConstruction.png", shortTitle: "Constr" },
    Sketcher_ViewSketch: { label: "View Sketch", group: "Sketcher", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_ViewSketch.png", shortTitle: "View" },
    Sketcher_ViewSection: { label: "View Section", group: "Sketcher", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_ViewSection.png", shortTitle: "Section" },
    Sketcher_LeaveSketch: { label: "Close Sketch", group: "Sketcher", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_LeaveSketch.png", shortTitle: "Close" },
    Sketcher_CarbonCopy: { label: "Carbon Copy", group: "Sketcher", icon: "resources/icons/FreeCAD_Sketcher/Sketcher_CarbonCopy.png", shortTitle: "Carbon" },

    // --- Sketcher (Constraints) ---
    Sketcher_ConstrainCoincident: { label: "Coincident", group: "Constraints", icon: "resources/icons/FreeCAD_Sketcher/Constraint_Coincident.png", shortTitle: "Coinc" },
    Sketcher_ConstrainHorizontal: { label: "Horizontal", group: "Constraints", icon: "resources/icons/FreeCAD_Sketcher/Constraint_Horizontal.png", shortTitle: "Horiz" },
    Sketcher_ConstrainVertical: { label: "Vertical", group: "Constraints", icon: "resources/icons/FreeCAD_Sketcher/Constraint_Vertical.png", shortTitle: "Vert" },
    Sketcher_ConstrainParallel: { label: "Parallel", group: "Constraints", icon: "resources/icons/FreeCAD_Sketcher/Constraint_Parallel.png", shortTitle: "Paral" },
    Sketcher_ConstrainPerpendicular: { label: "Perpendicular", group: "Constraints", icon: "resources/icons/FreeCAD_Sketcher/Constraint_Perpendicular.png", shortTitle: "Perp" },
    Sketcher_ConstrainTangent: { label: "Tangent", group: "Constraints", icon: "resources/icons/FreeCAD_Sketcher/Constraint_Tangent.png", shortTitle: "Tang" },
    Sketcher_ConstrainEqual: { label: "Equal", group: "Constraints", icon: "resources/icons/FreeCAD_Sketcher/Constraint_EqualLength.png", shortTitle: "Equal" },
    Sketcher_ConstrainSymmetric: { label: "Symmetric", group: "Constraints", icon: "resources/icons/FreeCAD_Sketcher/Constraint_Symmetric.png", shortTitle: "Sym" },
    Sketcher_ConstrainPointOnObject: { label: "Point On Object", group: "Constraints", icon: "resources/icons/FreeCAD_Sketcher/Constraint_PointOnObject.png", shortTitle: "PtObj" },
    Sketcher_Dimension: { label: "Dimension (Auto)", group: "Constraints", icon: "resources/icons/FreeCAD_Sketcher/Constraint_Dimension.png", shortTitle: "Dim" },
    Sketcher_ConstrainDistance: { label: "Distance", group: "Constraints", icon: "resources/icons/FreeCAD_Sketcher/Constraint_Length.png", shortTitle: "Dist" },
    Sketcher_ConstrainDistanceX: { label: "Horizontal Distance", group: "Constraints", icon: "resources/icons/FreeCAD_Sketcher/Constraint_HorizontalDistance.png", shortTitle: "Dist X" },
    Sketcher_ConstrainDistanceY: { label: "Vertical Distance", group: "Constraints", icon: "resources/icons/FreeCAD_Sketcher/Constraint_VerticalDistance.png", shortTitle: "Dist Y" },
    Sketcher_ConstrainRadius: { label: "Radius", group: "Constraints", icon: "resources/icons/FreeCAD_Sketcher/Constraint_Radius.png", shortTitle: "Rad" },
    Sketcher_ConstrainDiameter: { label: "Diameter", group: "Constraints", icon: "resources/icons/FreeCAD_Sketcher/Constraint_Diameter.png", shortTitle: "Diam" },
    Sketcher_ConstrainAngle: { label: "Angle", group: "Constraints", icon: "resources/icons/FreeCAD_Sketcher/Constraint_InternalAngle.png", shortTitle: "Angle" },
    Sketcher_ConstrainLock: { label: "Lock", group: "Constraints", icon: "resources/icons/FreeCAD_Sketcher/Constraint_Lock.png", shortTitle: "Lock" },

    // --- Part ---
    Part_Box: { label: "Box (Cubo)", group: "Part", icon: "resources/icons/FreeCAD_Part/Part_Box_Parametric.png", shortTitle: "Box" },
    Part_Cylinder: { label: "Cylinder", group: "Part", icon: "resources/icons/FreeCAD_Part/Part_Cylinder_Parametric.png", shortTitle: "Cyl" },
    Part_Sphere: { label: "Sphere", group: "Part", icon: "resources/icons/FreeCAD_Part/Part_Sphere_Parametric.png", shortTitle: "Sphere" },
    Part_Cone: { label: "Cone", group: "Part", icon: "resources/icons/FreeCAD_Part/Part_Cone_Parametric.png", shortTitle: "Cone" },
    Part_Fuse: { label: "Union (Fuse)", group: "Part", icon: "resources/icons/FreeCAD_Part/Part_Fuse.png", shortTitle: "Union" },
    Part_Cut: { label: "Cut (Subtrair)", group: "Part", icon: "resources/icons/FreeCAD_Part/Part_Cut.png", shortTitle: "Cut" },
    Part_Common: { label: "Intersection", group: "Part", icon: "resources/icons/FreeCAD_Part/Part_Common.png", shortTitle: "Common" },
    Part_Extrude: { label: "Extrude", group: "Part", icon: "resources/icons/FreeCAD_Part/Part_Extrude.png", shortTitle: "Extrude" },
    Part_Revolve: { label: "Revolve", group: "Part", icon: "resources/icons/FreeCAD_Part/Part_Revolve.png", shortTitle: "Revolve" },
    Part_Fillet: { label: "Fillet", group: "Part", icon: "resources/icons/FreeCAD_Part/Part_Fillet.png", shortTitle: "Fillet" },
    Part_Chamfer: { label: "Chamfer", group: "Part", icon: "resources/icons/FreeCAD_Part/Part_Chamfer.png", shortTitle: "Chamfer" },
    Part_Mirror: { label: "Mirror", group: "Part", icon: "resources/icons/FreeCAD_Part/Part_Mirror.png", shortTitle: "Mirror" },
    Part_Loft: { label: "Loft", group: "Part", icon: "resources/icons/FreeCAD_Part/Part_Loft.png", shortTitle: "Loft" },
    Part_Sweep: { label: "Sweep", group: "Part", icon: "resources/icons/FreeCAD_Part/Part_Sweep.png", shortTitle: "Sweep" },
    Part_Thickness: { label: "Thickness", group: "Part", icon: "resources/icons/FreeCAD_Part/Part_Thickness.png", shortTitle: "Thick" },
    Part_Compound: { label: "Make Compound", group: "Part", icon: "resources/icons/FreeCAD_Part/Part_Compound.png", shortTitle: "Comp" },
    Part_CheckGeometry: { label: "Check Geometry", group: "Part", icon: "resources/icons/FreeCAD_Part/Part_CheckGeometry.png", shortTitle: "Check" },
    Part_ShapeFromMesh: { label: "Shape from Mesh", group: "Part", icon: "resources/icons/FreeCAD_Part/Part_Shape_from_Mesh.png", shortTitle: "Mesh" },
    Part_MakeSolid: { label: "Convert to Solid", group: "Part", icon: "resources/icons/FreeCAD_Part/Part_MakeSolid.png", shortTitle: "Solid" },
    Part_RefineShape: { label: "Refine Shape", group: "Part", icon: "resources/icons/FreeCAD_Part/Part_Refine_Shape.png", shortTitle: "Refine" },
  });

  // Layouts automáticos por bancada (Slot 13 cicla páginas quando há mais de 1)
  const RAW_WORKBENCH_PAGES = {
    default: [
      {
        name: "Core",
        slots: {
          1: "Std_ViewIsometric",
          2: "Std_ViewFitAll",
          3: "Std_ViewTop",
          4: "Std_ViewFront",
          5: "Std_ViewRight",
          6: "Std_Refresh",
          7: "Std_ToggleClipPlane",
          8: "Std_ToggleTransparency",
          9: "Std_Measure",
          10: "Std_VarSet",
          11: "Std_Import",
          12: "Std_Export",
          13: "Std_PerspectiveCamera",
        },
      },
    ],
    PartDesignWorkbench: [
      {
        name: "PD",
        slots: {
          1: "PartDesign_Body",
          2: "PartDesign_NewSketch",
          3: "PartDesign_Pad",
          4: "PartDesign_Pocket",
          5: "PartDesign_Fillet",
          6: "PartDesign_Chamfer",
          7: "PartDesign_Revolution",
          8: "PartDesign_Groove",
          9: "PartDesign_Hole",
          10: "PartDesign_Mirrored",
          11: "PartDesign_LinearPattern",
          12: "PartDesign_PolarPattern",
          13: "__NEXT_PAGE__",
        },
      },
      {
        name: "PD+",
        slots: {
          1: "PartDesign_SubShapeBinder",
          2: "PartDesign_ShapeBinder",
          3: "PartDesign_Boolean",
          4: "PartDesign_MultiTransform",
          5: "PartDesign_AdditiveLoft",
          6: "PartDesign_AdditivePipe",
          7: "PartDesign_AdditiveHelix",
          8: "PartDesign_Thickness",
          9: "PartDesign_Draft",
          10: "PartDesign_Plane",
          11: "Std_VarSet",
          12: "Std_Export",
          13: "__NEXT_PAGE__",
        },
      },
    ],
    SketcherWorkbench: [
      {
        name: "Sketch",
        slots: {
          1: "Sketcher_CreateLine",
          2: "Sketcher_CreatePolyline",
          3: "Sketcher_CreateRectangle",
          4: "Sketcher_CreateCircle",
          5: "Sketcher_CreateArc",
          6: "Sketcher_CreateSlot",
          7: "Sketcher_CreateFillet",
          8: "Sketcher_Trimming",
          9: "Sketcher_External",
          10: "Sketcher_ToggleConstruction",
          11: "Sketcher_ViewSection",
          12: "Sketcher_LeaveSketch",
          13: "__NEXT_PAGE__",
        },
      },
      {
        name: "Constr",
        slots: {
          1: "Sketcher_Dimension",
          2: "Sketcher_ConstrainCoincident",
          3: "Sketcher_ConstrainHorizontal",
          4: "Sketcher_ConstrainVertical",
          5: "Sketcher_ConstrainParallel",
          6: "Sketcher_ConstrainPerpendicular",
          7: "Sketcher_ConstrainTangent",
          8: "Sketcher_ConstrainEqual",
          9: "Sketcher_ConstrainSymmetric",
          10: "Sketcher_ConstrainDistanceX",
          11: "Sketcher_ConstrainDistanceY",
          12: "Sketcher_ConstrainRadius",
          13: "__NEXT_PAGE__",
        },
      },
      {
        name: "Tools",
        slots: {
          1: "Sketcher_CarbonCopy",
          2: "Sketcher_Translate",
          3: "Sketcher_Rotate",
          4: "Sketcher_Scale",
          5: "Sketcher_Offset",
          6: "Sketcher_Symmetry",
          7: "Sketcher_RemoveAxesAlignment",
          8: "Sketcher_ToggleConstruction",
          9: "Sketcher_ConstrainDiameter",
          10: "Sketcher_ConstrainAngle",
          11: "Sketcher_ConstrainPointOnObject",
          12: "Sketcher_ConstrainLock",
          13: "__NEXT_PAGE__",
        },
      },
    ],
    PartWorkbench: [
      {
        name: "Part",
        slots: {
          1: "Part_Box",
          2: "Part_Cylinder",
          3: "Part_Fuse",
          4: "Part_Cut",
          5: "Part_Common",
          6: "Part_Extrude",
          7: "Part_Revolve",
          8: "Part_Fillet",
          9: "Part_Chamfer",
          10: "Part_Mirror",
          11: "Part_CheckGeometry",
          12: "Part_RefineShape",
          13: "Std_ViewFitAll",
        },
      },
    ],
  };

  const WORKBENCH_PAGES = Object.create(null);
  for (const [wb, pages] of Object.entries(RAW_WORKBENCH_PAGES)) {
    WORKBENCH_PAGES[wb] = Object.freeze(
      pages.map((page) =>
        Object.freeze({
          name: page.name,
          slots: Object.freeze(Object.assign(Object.create(null), page.slots)),
        })
      )
    );
  }
  Object.freeze(WORKBENCH_PAGES);

  // Layout automático do teclado numérico (D200X 5x3):
  // 7-8-9 / 4-5-6 / 1-2-3 + 0 (slot 4), decimal (slot 9), Backspace (slot 5), Tab (slot 10)
  const DIALOG_NUMPAD_SLOTS = Object.freeze(
    Object.assign(Object.create(null), {
      1: "__NUMPAD_7__",
      2: "__NUMPAD_8__",
      3: "__NUMPAD_9__",
      4: "__NUMPAD_0__",
      5: "__NUMPAD_BACKSPACE__",
      6: "__NUMPAD_4__",
      7: "__NUMPAD_5__",
      8: "__NUMPAD_6__",
      9: "__NUMPAD_DECIMAL__",
      10: "__NUMPAD_TAB__",
      11: "__NUMPAD_1__",
      12: "__NUMPAD_2__",
      13: "__NUMPAD_3__",
    })
  );

  return Object.freeze({
    COMMANDS,
    WORKBENCH_PAGES,
    DIALOG_NUMPAD_SLOTS,
  });
});
