/*! wmf.js (C) 2020-present SheetJS LLC -- https://sheetjs.com */
import { PreppedBytes, RawBytes, bconcat, prep_blob } from './util';
import { WMFRecords, WMFEscapes } from './Records';

export interface Brush {
	/** Style (MS-WMF 2.1.1.4) */
	Style?: Number;
	/** Brush color RGB */
	Color?: number;
	/** Hatch Type (2.1.1.12 if brush is hatched) */
	Hatch?: number;
}

export interface Pen {
	Style?: number;
	Width?: number;
	Color?: number;
}

export interface Font {
	Name?: string;
	Height?: number;
	Italic?: boolean;
	Weight?: number;
	Angle?: number;
}

export interface PlaybackDeviceContextState {
	/** Mapping mode (MS-WMF 2.1.1.16) */
	MapMode?: number;
	/** Output window origin (X, Y) */
	Origin?: [number, number];
	/** Output window extents (X, Y) */
	Extent?: [number, number];
	/** Background Mix Mode (MS-WMF 2.1.1.20) */
	BkMode?: number;
	/** Polygon fill mode (MS-WMF 2.1.1.25) */
	PolyFillMode?: number;
	/** Bitmap stretching mode (MS-WMF 2.1.1.30) */
	StretchMode?: number;
	/** Text alignment mode (MS-WMF 2.1.2.3 / 2.1.2.4) */
	TextAlignmentMode?: number;
	/** Text foreground color RGB */
	TextColor?: number;
	/** Brush */
	Brush?: Brush;
	/** Font */
	Font?: Font;
	/** Pen */
	Pen?: Pen;
	/** Clipping Region (x,y) LT (x,y) RB */
	ClipRect?: [[number, number], [number, number]];
}

/** [x, y] */
export type Point = [ number, number ];

export interface ActionCommon {
	/** State */
	s?: PlaybackDeviceContextState;
}

/** Draw Text */
export interface ActionText extends ActionCommon {
	/** Action Type */
	t: "text";

	/** Text */
	v: string;

	/** Origin */
	p?: Point;
}

/** Draw Polygon (shape with stroke/fill) / Polyline (stroke only) */
export interface ActionPoly extends ActionCommon {
	/** Action Type */
	t: "poly";

	/** Points */
	p: Point[];

	/** Polygon (true) or Polyline (false) */
	g: boolean;
}

export interface ActionRaster {
	/** Raster Operaton 2.1.1.31 */
	rop?: number;
}

export interface ActionCpy extends ActionCommon, ActionRaster {
	t: "cpy";

	/** Source [[X, W], [Y, H]] */
	src: [[number, number], [number, number]];

	dst: Point;

	data?: any;
}

export interface ActionStr extends ActionCommon, ActionRaster {
	t: "str";

	/** Source [[X, W], [Y, H]] */
	src: [[number, number], [number, number]];

	/** Dest [[X, W], [Y, H]] */
	dst: [[number, number], [number, number]];

	data?: any;
}

export type Action = ActionText | ActionPoly | ActionCpy | ActionStr;

const parse_emf = (data: PreppedBytes): void => {
	//try { require("fs").writeFileSync("out.emf", data); } catch(e) {}
}

/* 2.2.2.9 */
const parse_dib = (data: PreppedBytes) => {
	if(data.length == 0) return null;
	prep_blob(data, 0);

	/* DIBHeaderInfo */
	const HeaderSize = data.read_shift(4);
	let Width = 0, Height = 0, Planes = 0, BitCount = 0;
	let Compression = 0, ImageSize = 0, XPelsPerMeter = 0, YPelsPerMeter = 0, ColorUsed = 0, ColorImportant = 0;
	if(HeaderSize == 0x0C) {
		Width = data.read_shift(2);
		Height = data.read_shift(2);
	} else {
		Width = data.read_shift(4, 'i');
		Height = data.read_shift(4, 'i');
	}
	Planes = data.read_shift(2);
	BitCount = data.read_shift(2);

	const out: object = {
		Width,
		Height,
		BitCount,
	};

	if(HeaderSize != 0x0C) {
		Compression = data.read_shift(4);
		ImageSize = data.read_shift(4);
		XPelsPerMeter = data.read_shift(4, 'i');
		YPelsPerMeter = data.read_shift(4, 'i');
		ColorUsed = data.read_shift(4);
		ColorImportant = data.read_shift(4);
		out["Compression"] = Compression;
		if(BitCount == 24 && ImageSize > Height * 3 * Width) Width = out["Width"] = ImageSize / (Height * 3);
	}

	/* Colors */
	/* BitmapBuffer */
	if(ImageSize == data.length - data.l) {
		out["ImageData"] = data.slice(data.l, data.length);
		prep_blob(out["ImageData"], 0);
	}
	return out;
}

const add_to_objects = (objects: PlaybackDeviceContextState[], obj: PlaybackDeviceContextState): void => {
	let found = false;
	for(var i = 0; i < objects.length; ++i) if(!objects[i]) { objects[i] = obj; found = true; }
	if(!found) objects.push(obj);
}

export const get_actions_prepped_bytes = (data: PreppedBytes): Action[] => {
	const out: Action[] = [];

	/* 2.3.22 META_HEADER */
	// Type (2 bytes) must be 1 or 2
	let h = data.read_shift(2);
	if(h != 1 && h != 2) throw `Header: Type ${h} must be 1 or 2`;
	// HeaderSize expected to be 9
	if((h = data.read_shift(2)) != 9) throw `Header: HeaderSize ${h} must be 9`;
	// Version (2 bytes) 1 or 3
	h = data.read_shift(2);
	if(h != 0x0100 && h != 0x0300) throw `Header: Version ${h} must be 0x0100 or 0x0300`;
	// SizeLow
	// SizeHigh
	// #Objects
	// MaxRecord
	// NumberOfMembers
	data.l = 18;

	let rt = 0;

	/* used for EMF */
	let escapecnt = 0;
	let CommentRecordCount = 0;
	let RemainingBytes = 0;
	let EnhancedMetafileDataSize = 0;
	let bufs: RawBytes[] = [];

	let objects: PlaybackDeviceContextState[] = [];
	let states: PlaybackDeviceContextState[] = [];
	let state: PlaybackDeviceContextState = {};
	let sidx = -1;

	while(data.l < data.length) {
		h = data.read_shift(4);
		const end = data.l + h*2 - 4;

		rt = data.read_shift(2);
		let Record = WMFRecords[rt];
		if(rt == 0x0000) break; // META_EOF

		switch(rt) {
			case 0x0626: { // META_ESCAPE
				const EscapeFunction = data.read_shift(2);
				const Escape = WMFEscapes[EscapeFunction];
				//console.log("::", Escape);
				/* 2.3.6 */
				switch(EscapeFunction) {
					case 0x000F: { // META_ESCAPE_ENHANCED_METAFILE
						const ByteCount = data.read_shift(2);
						let tmp = data.read_shift(4);
						if(tmp != 0x43464D57) throw `Escape: Comment ID 0x${tmp.toString(16)} != 0x43464D57`;
						tmp = data.read_shift(4);
						if(tmp != 0x00000001) throw `Escape: Comment Type 0x${tmp.toString(16)} != 0x00000001`;
						tmp = data.read_shift(4);
						if(tmp != 0x00010000) throw `Escape: Version 0x${tmp.toString(16)} != 0x00010000`;

						const Checksum = data.read_shift(2);

						data.l += 4; // Flags
						if(escapecnt == 0) {
							CommentRecordCount = data.read_shift(4); // total number of records
						} else {
							const _CommentRecordCount = data.read_shift(4);
							if(_CommentRecordCount != CommentRecordCount) throw `Escape: CommentRecordCount ${_CommentRecordCount} != ${CommentRecordCount}`;
						}
						const CurrentRecordSize = data.read_shift(4); // size of this record
						const _RemainingBytes = data.read_shift(4);
						if(escapecnt > 0 && CurrentRecordSize + _RemainingBytes != RemainingBytes) throw `Escape: ${RemainingBytes} != ${CurrentRecordSize} + ${_RemainingBytes}`;
						RemainingBytes = _RemainingBytes;
						const _EnhancedMetafileDataSize = data.read_shift(4);
						if(escapecnt == 0) {
							if(_EnhancedMetafileDataSize != CurrentRecordSize + _RemainingBytes) throw `Escape: ${_EnhancedMetafileDataSize} != ${CurrentRecordSize} + ${_RemainingBytes}`;
							EnhancedMetafileDataSize = _EnhancedMetafileDataSize;
						} else if(EnhancedMetafileDataSize != _EnhancedMetafileDataSize) throw `Escape: ${EnhancedMetafileDataSize} != ${_EnhancedMetafileDataSize}`;

						if(ByteCount != (end - data.l) + 34) throw `Escape: Sizes ${ByteCount} != ${end - data.l} + 34`
						if(end - data.l != CurrentRecordSize) throw `Escape: CRSize ${CurrentRecordSize} != ${end - data.l}`;
						bufs.push(data.slice(data.l, end));
						++escapecnt;
						if(escapecnt == CommentRecordCount) {
							const prepped: PreppedBytes = bconcat(bufs) as PreppedBytes;
							prep_blob(prepped, 0);
							parse_emf(prepped);
						}
					} break;
					default: throw `Escape: Unrecognized META_ESCAPE Type 0x${EscapeFunction.toString(16)}`;
				}
			} break;

			// #region 2.3.1 Bitmap Record Types

			case 0x0940: { // 2.3.1.2 META_DIBBITBLT
				const has_bitmap = h != (rt>>8)+3;
				const RasterOperation = data.read_shift(4);
				const YSrc = data.read_shift(2, "i");
				const XSrc = data.read_shift(2, "i");
				if(!has_bitmap) data.l += 2;
				const Height = data.read_shift(2, "i");
				const Width = data.read_shift(2, "i");
				const YDest = data.read_shift(2, "i");
				const XDest = data.read_shift(2, "i");
				const res: ActionCpy = {
					t: "cpy",
					src: [[XSrc, Width], [YSrc, Height]],
					dst: [XDest, YDest],
					rop: RasterOperation,
					s: Object.assign({}, state)
				};
				if(has_bitmap) {
					const DIB = parse_dib(data.slice(data.l, end) as PreppedBytes);
					res.data = DIB;
				}
				out.push(res);
			} break;

			case 0x0B41: { // 2.3.1.3 META_DIBSTRETCHBLT
				const has_bitmap = h != (rt>>8)+3;
				const RasterOperation = data.read_shift(4);
				const SrcHeight = data.read_shift(2, "i");
				const SrcWidth = data.read_shift(2, "i");
				const YSrc = data.read_shift(2, "i");
				const XSrc = data.read_shift(2, "i");
				if(!has_bitmap) data.l += 2;
				const DestHeight = data.read_shift(2, "i");
				const DestWidth = data.read_shift(2, "i");
				const YDest = data.read_shift(2, "i");
				const XDest = data.read_shift(2, "i");
				const res: ActionStr = {
					t: "str",
					src: [[XSrc, SrcWidth], [YSrc, SrcHeight]],
					dst: [[XDest, DestWidth], [YDest, DestHeight]],
					rop: RasterOperation,
					s: Object.assign({}, state)
				};
				if(has_bitmap) {
					const DIB = parse_dib(data.slice(data.l, end) as PreppedBytes);
					res.data = DIB;
				}
				out.push(res);
			} break;

			// #endregion

			// #region 2.3.3 Drawing Record Types

			case 0x0A32: { // 2.3.3.5 META_EXTTEXTOUT
				const Y = data.read_shift(2);
				const X = data.read_shift(2);
				const StringLength = data.read_shift(2);
				const fwOpts = data.read_shift(2); // 2.1.2.2
				if(fwOpts & 0x06) {
					data.l += 8; // Rectangle 2.2.2.18 (for clipping/opaquing)
				}
				const str = data.read_shift(StringLength, 'cpstr');
				if(data.l < end){/* TODO: Dx */}
				out.push({t: "text", v: str, p: [X, Y], s: Object.assign({}, state)});
				/* TODO!! */
			} break;

			case 0x0325: // 2.3.3.14 META_POLYLINE
			case 0x0324: // 2.3.3.15 META_POLYGON
			{
				const nPoints = data.read_shift(2);
				const points: Array<Point> = [];
				for(let i = 0; i < nPoints; ++i) points.push([data.read_shift(2), data.read_shift(2)])
				out.push({t: "poly", p: points, g: rt !== 0x0325, s: state});
			} break;

			case 0x0538: { // 2.3.3.16 META_POLYPOLYGON
				const nPolygons = data.read_shift(2);
				const polys: Array<Array<Point> > = [];
				const szs: number[] = [];
				/* 2.2.2.17 PolyPolygon */
				for(let i = 0; i < nPolygons; ++i) szs[i] = data.read_shift(2);
				for(let i = 0; i < szs.length; ++i) {
					polys[i] = [];
					for(let j = 0; j < szs[i]; ++j) polys[i].push([data.read_shift(2), data.read_shift(2)])
					out.push({t: "poly", p: polys[i], g: true, s: state});
				}
			} break;

			// #endregion

			// #region 2.3.4 Object Record Types

			case 0x02FC: { // 2.3.4.1 META_CREATEBRUSHINDIRECT
				const obj: PlaybackDeviceContextState = {};
				obj.Brush = {
					Style: data.read_shift(2),
					Color: data.read_shift(4),
					Hatch: data.read_shift(2)
				};
				add_to_objects(objects, obj);
			} break;

			case 0x02FB: { // 2.3.4.2 META_CREATEFONTINDIRECT
				const obj: PlaybackDeviceContextState = {};
				obj.Font = {};
				/* 2.2.1.2 Font TODO!! */
				const Height = data.read_shift(2, "i");
				const Width = data.read_shift(2, "i");
				const Escapement = data.read_shift(2, "i");
				const Orientation = data.read_shift(2, "i");
				const Weight = data.read_shift(2, "i");
				const Italic = !!data.read_shift(1);
				const Underline = !!data.read_shift(1);
				const StrikeOut = !!data.read_shift(1);
				const CharSet = data.read_shift(1);
				const OutPrecision = data.read_shift(1);
				const ClipPrecision = data.read_shift(1);
				const Quality = data.read_shift(1);
				const PitchAndFamily = data.read_shift(1);
				const Facename = data.read_shift(32, "cstr");
				obj.Font.Name = Facename;
				obj.Font.Height = Height;
				obj.Font.Weight = Weight;
				obj.Font.Italic = Italic;
				obj.Font.Angle = Escapement / 10;
				add_to_objects(objects, obj);
			} break;

			case 0x02FA: { // 2.3.4.5 META_CREATEPENINDIRECT
				const obj: PlaybackDeviceContextState = {};
				obj.Pen = {
					Style: data.read_shift(2),
					Width: data.read_shift(4) & 0xFF,
					Color: data.read_shift(4)
				};
				add_to_objects(objects, obj);
			} break;

			case 0x01F0: { // 2.3.4.7 META_DELETEOBJECT
				const ObjectIndex = data.read_shift(2);
				//console.log("DELETE", ObjectIndex, objects[ObjectIndex]);
				objects[ObjectIndex] = null;
			} break;

			case 0x012C: { // 2.3.4.9 META_SELECTCLIPREGION
				const Region = data.read_shift(2);
				//console.log("CLIPREGION", Region, objects[Region]);
				//Object.assign(state, objects[Region]);
			} break;

			case 0x012D: { // 2.3.4.10 META_SELECTOBJECT
				const ObjectIndex = data.read_shift(2);
				//console.log("SELECT", ObjectIndex, objects[ObjectIndex]);
				Object.assign(state, objects[ObjectIndex]);
				// TODO!!
			} break;

			// #endregion

			// #region 2.3.5 State Record Types

			case 0x0416: // 2.3.5.3 META_INTERSECTCLIPRECT
				state.ClipRect = [[0,0],[0,0]];
				state.ClipRect[1][1] = data.read_shift(2);
				state.ClipRect[1][0] = data.read_shift(2);
				state.ClipRect[0][1] = data.read_shift(2);
				state.ClipRect[0][0] = data.read_shift(2);
				break;

			case 0x0127: { // 2.3.5.10 META_RESTOREDC
				const nSavedDC = data.read_shift(2, 'i');
				state = states[sidx = (nSavedDC >= 0 ? nSavedDC : sidx + nSavedDC)];
			} break;

			case 0x001E: // 2.3.5.11 META_SAVEDC
				states.push(state);
				sidx = states.length - 1;
				state = JSON.parse(JSON.stringify(state));
				break;

			case 0x0102: // 2.3.5.15 META_SETBKMODE
				state.BkMode = data.read_shift(2);
				break;

			case 0x0103: // 2.3.5.17 META_SETMAPMODE
				state.MapMode = data.read_shift(2);
				break;

			case 0x0106: // 2.3.5.20 META_SETPOLYFILLMODE
				state.PolyFillMode = data.read_shift(2);
				break;

			case 0x0107: // 2.3.5.23 META_SETSTRETCHBLTMODE
				state.StretchMode = data.read_shift(2);
				break;

			case 0x012E: // 2.3.5.24 META_SETTEXTALIGN
				state.TextAlignmentMode = data.read_shift(2);
				break;

			case 0x0209: // 2.3.5.26 META_SETTEXTCOLOR
				state.TextColor = data.read_shift(4);
				break;

			case 0x020C: // 2.3.5.30 META_SETWINDOWEXT
				state.Extent = [0, 0];
				state.Extent[1] = data.read_shift(2);
				state.Extent[0] = data.read_shift(2);
				break;

			case 0x020B: // 2.3.5.31 META_SETWINDOWORG
				state.Origin = [0, 0];
				state.Origin[1] = data.read_shift(2);
				state.Origin[0] = data.read_shift(2);
				break;

			// #endregion

			default:
				if(!Record) throw `Record: Unrecognized type 0x${rt.toString(16)}`;
				console.log(Record);
		}
		data.l = end;
		//if(rt != 0x0626) console.log(Record);
	}
	if(rt !== 0) throw `Record: Last Record Type ${rt} is not EOF type`;
	return out;
}

export const image_size_prepped_bytes = (data: PreppedBytes): [number, number] => {
	const origin: Point = [NaN, NaN], extents: Point = [NaN, NaN];

	/* 2.3.22 META_HEADER */
	// Type (2 bytes) must be 1 or 2
	let h = data.read_shift(2);
	if(h != 1 && h != 2) throw `Header: Type ${h} must be 1 or 2`;
	// HeaderSize expected to be 9
	if((h = data.read_shift(2)) != 9) throw `Header: HeaderSize ${h} must be 9`;
	// Version (2 bytes) 1 or 3
	h = data.read_shift(2);
	if(h != 0x0100 && h != 0x0300) throw `Header: Version ${h} must be 0x0100 or 0x0300`;
	data.l = 18;

	let rt = 0;

	while(data.l < data.length) {
		h = data.read_shift(4);
		const end = data.l + h*2 - 4;

		rt = data.read_shift(2);
		if(rt == 0x0000) break; // META_EOF

		switch(rt) {
			case 0x020C: // 2.3.5.30 META_SETWINDOWEXT
				extents[1] = data.read_shift(2);
				extents[0] = data.read_shift(2);
				break;

			case 0x020B: // 2.3.5.31 META_SETWINDOWORG
				origin[1] = data.read_shift(2);
				origin[0] = data.read_shift(2);
				break;
		}
		data.l = end;
	}

	return [extents[0] - origin[0], extents[1] - origin[1]];
};