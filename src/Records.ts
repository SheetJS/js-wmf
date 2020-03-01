/*! wmf.js (C) 2020-present SheetJS LLC -- https://sheetjs.com */
export interface WMFRecord {
	n: string;
}

export interface WMFEscape {
	n: string;
}

/* 2.1.1.1 RecordType Enumeration */
export const WMFRecords: {[key: number]: WMFRecord} = {
	0x0000: { n: "META_EOF" }, // 2.3.2.1
	0x0626: { n: "META_ESCAPE" }, // 2.3.6.1

	0x0940: { n: "META_DIBBITBLT" }, // 2.3.1.2
	0x0B41: { n: "META_DIBSTRETCHBLT" }, // 2.3.1.3

	0x0A32: { n: "META_EXTTEXTOUT" }, // 2.3.3.5
	0x0325: { n: "META_POLYLINE" }, // 2.3.3.14
	0x0324: { n: "META_POLYGON" }, // 2.3.3.15
	0x0538: { n: "META_POLYPOLYGON" }, // 2.3.3.16

	0x02FC: { n: "META_CREATEBRUSHINDIRECT" }, // 2.3.4.1
	0x02FB: { n: "META_CREATEFONTINDIRECT" }, // 2.3.4.2
	0x02FA: { n: "META_CREATEPENINDIRECT" }, // 2.3.4.5
	0x01F0: { n: "META_DELETEOBJECT" }, // 2.3.4.7
	0x012C: { n: "META_SELECTCLIPREGION" }, // 2.3.4.9
	0x012D: { n: "META_SELECTOBJECT" }, // 2.3.4.10

	0x0416: { n: "META_INTERSECTCLIPRECT" }, // 2.3.5.3
	0x0035: { n: "META_REALIZEPALETTE" }, // 2.3.5.8
	0x0127: { n: "META_RESTOREDC" }, // 2.3.5.10
	0x001E: { n: "META_SAVEDC" }, // 2.3.5.11
	0x0102: { n: "META_SETBKMODE" }, // 2.3.5.15
	0x0103: { n: "META_SETMAPMODE" }, // 2.3.5.17
	0x0037: { n: "META_SETPALENTRIES" }, // 2.3.5.19
	0x0106: { n: "META_SETPOLYFILLMODE" }, // 2.3.5.20
	0x0107: { n: "META_SETSTRETCHBLTMODE" }, // 2.3.5.23
	0x012E: { n: "META_SETTEXTALIGN" }, // 2.3.5.24
	0x0209: { n: "META_SETTEXTCOLOR" }, // 2.3.5.26
	0x020C: { n: "META_SETWINDOWEXT" }, // 2.3.5.30
	0x020B: { n: "META_SETWINDOWORG" }, // 2.3.5.31

	0xFFFF: { n: "META_SHEETJS" }
};

export const WMFEscapes: {[key: number]: WMFEscape} = {
	0x000F: { n: "META_ESCAPE_ENHANCED_METAFILE" }
};

