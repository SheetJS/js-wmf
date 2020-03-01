"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* 2.1.1.1 RecordType Enumeration */
exports.WMFRecords = {
    0x0000: { n: "META_EOF" },
    0x0626: { n: "META_ESCAPE" },
    0x0940: { n: "META_DIBBITBLT" },
    0x0B41: { n: "META_DIBSTRETCHBLT" },
    0x0A32: { n: "META_EXTTEXTOUT" },
    0x0325: { n: "META_POLYLINE" },
    0x0324: { n: "META_POLYGON" },
    0x0538: { n: "META_POLYPOLYGON" },
    0x02FC: { n: "META_CREATEBRUSHINDIRECT" },
    0x02FB: { n: "META_CREATEFONTINDIRECT" },
    0x02FA: { n: "META_CREATEPENINDIRECT" },
    0x01F0: { n: "META_DELETEOBJECT" },
    0x012C: { n: "META_SELECTCLIPREGION" },
    0x012D: { n: "META_SELECTOBJECT" },
    0x0416: { n: "META_INTERSECTCLIPRECT" },
    0x0035: { n: "META_REALIZEPALETTE" },
    0x0127: { n: "META_RESTOREDC" },
    0x001E: { n: "META_SAVEDC" },
    0x0102: { n: "META_SETBKMODE" },
    0x0103: { n: "META_SETMAPMODE" },
    0x0037: { n: "META_SETPALENTRIES" },
    0x0106: { n: "META_SETPOLYFILLMODE" },
    0x0107: { n: "META_SETSTRETCHBLTMODE" },
    0x012E: { n: "META_SETTEXTALIGN" },
    0x0209: { n: "META_SETTEXTCOLOR" },
    0x020C: { n: "META_SETWINDOWEXT" },
    0x020B: { n: "META_SETWINDOWORG" },
    0xFFFF: { n: "META_SHEETJS" }
};
exports.WMFEscapes = {
    0x000F: { n: "META_ESCAPE_ENHANCED_METAFILE" }
};
//# sourceMappingURL=Records.js.map