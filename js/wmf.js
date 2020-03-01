"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*! wmf.js (C) 2020-present SheetJS LLC -- https://sheetjs.com */
var util_1 = require("./util");
var Records_1 = require("./Records");
var parse_emf = function (data) {
    //try { require("fs").writeFileSync("out.emf", data); } catch(e) {}
};
/* 2.2.2.9 */
var parse_dib = function (data) {
    if (data.length == 0)
        return null;
    util_1.prep_blob(data, 0);
    /* DIBHeaderInfo */
    var HeaderSize = data.read_shift(4);
    var Width = 0, Height = 0, Planes = 0, BitCount = 0;
    var Compression = 0, ImageSize = 0, XPelsPerMeter = 0, YPelsPerMeter = 0, ColorUsed = 0, ColorImportant = 0;
    if (HeaderSize == 0x0C) {
        Width = data.read_shift(2);
        Height = data.read_shift(2);
    }
    else {
        Width = data.read_shift(4, 'i');
        Height = data.read_shift(4, 'i');
    }
    Planes = data.read_shift(2);
    BitCount = data.read_shift(2);
    var out = {
        Width: Width,
        Height: Height,
        BitCount: BitCount,
    };
    if (HeaderSize != 0x0C) {
        Compression = data.read_shift(4);
        ImageSize = data.read_shift(4);
        XPelsPerMeter = data.read_shift(4, 'i');
        YPelsPerMeter = data.read_shift(4, 'i');
        ColorUsed = data.read_shift(4);
        ColorImportant = data.read_shift(4);
        out["Compression"] = Compression;
        if (BitCount == 24 && ImageSize > Height * 3 * Width)
            Width = out["Width"] = ImageSize / (Height * 3);
    }
    /* Colors */
    /* BitmapBuffer */
    if (ImageSize == data.length - data.l) {
        out["ImageData"] = data.slice(data.l, data.length);
        util_1.prep_blob(out["ImageData"], 0);
    }
    return out;
};
var add_to_objects = function (objects, obj) {
    var found = false;
    for (var i = 0; i < objects.length; ++i)
        if (!objects[i]) {
            objects[i] = obj;
            found = true;
        }
    if (!found)
        objects.push(obj);
};
exports.get_actions_prepped_bytes = function (data) {
    var out = [];
    /* 2.3.22 META_HEADER */
    // Type (2 bytes) must be 1 or 2
    var h = data.read_shift(2);
    if (h != 1 && h != 2)
        throw "Header: Type " + h + " must be 1 or 2";
    // HeaderSize expected to be 9
    if ((h = data.read_shift(2)) != 9)
        throw "Header: HeaderSize " + h + " must be 9";
    // Version (2 bytes) 1 or 3
    h = data.read_shift(2);
    if (h != 0x0100 && h != 0x0300)
        throw "Header: Version " + h + " must be 0x0100 or 0x0300";
    // SizeLow
    // SizeHigh
    // #Objects
    // MaxRecord
    // NumberOfMembers
    data.l = 18;
    var rt = 0;
    /* used for EMF */
    var escapecnt = 0;
    var CommentRecordCount = 0;
    var RemainingBytes = 0;
    var EnhancedMetafileDataSize = 0;
    var bufs = [];
    var objects = [];
    var states = [];
    var state = {};
    var sidx = -1;
    while (data.l < data.length) {
        h = data.read_shift(4);
        var end = data.l + h * 2 - 4;
        rt = data.read_shift(2);
        var Record = Records_1.WMFRecords[rt];
        if (rt == 0x0000)
            break; // META_EOF
        switch (rt) {
            case 0x0626:
                { // META_ESCAPE
                    var EscapeFunction = data.read_shift(2);
                    var Escape = Records_1.WMFEscapes[EscapeFunction];
                    //console.log("::", Escape);
                    /* 2.3.6 */
                    switch (EscapeFunction) {
                        case 0x000F:
                            { // META_ESCAPE_ENHANCED_METAFILE
                                var ByteCount = data.read_shift(2);
                                var tmp = data.read_shift(4);
                                if (tmp != 0x43464D57)
                                    throw "Escape: Comment ID 0x" + tmp.toString(16) + " != 0x43464D57";
                                tmp = data.read_shift(4);
                                if (tmp != 0x00000001)
                                    throw "Escape: Comment Type 0x" + tmp.toString(16) + " != 0x00000001";
                                tmp = data.read_shift(4);
                                if (tmp != 0x00010000)
                                    throw "Escape: Version 0x" + tmp.toString(16) + " != 0x00010000";
                                var Checksum = data.read_shift(2);
                                data.l += 4; // Flags
                                if (escapecnt == 0) {
                                    CommentRecordCount = data.read_shift(4); // total number of records
                                }
                                else {
                                    var _CommentRecordCount = data.read_shift(4);
                                    if (_CommentRecordCount != CommentRecordCount)
                                        throw "Escape: CommentRecordCount " + _CommentRecordCount + " != " + CommentRecordCount;
                                }
                                var CurrentRecordSize = data.read_shift(4); // size of this record
                                var _RemainingBytes = data.read_shift(4);
                                if (escapecnt > 0 && CurrentRecordSize + _RemainingBytes != RemainingBytes)
                                    throw "Escape: " + RemainingBytes + " != " + CurrentRecordSize + " + " + _RemainingBytes;
                                RemainingBytes = _RemainingBytes;
                                var _EnhancedMetafileDataSize = data.read_shift(4);
                                if (escapecnt == 0) {
                                    if (_EnhancedMetafileDataSize != CurrentRecordSize + _RemainingBytes)
                                        throw "Escape: " + _EnhancedMetafileDataSize + " != " + CurrentRecordSize + " + " + _RemainingBytes;
                                    EnhancedMetafileDataSize = _EnhancedMetafileDataSize;
                                }
                                else if (EnhancedMetafileDataSize != _EnhancedMetafileDataSize)
                                    throw "Escape: " + EnhancedMetafileDataSize + " != " + _EnhancedMetafileDataSize;
                                if (ByteCount != (end - data.l) + 34)
                                    throw "Escape: Sizes " + ByteCount + " != " + (end - data.l) + " + 34";
                                if (end - data.l != CurrentRecordSize)
                                    throw "Escape: CRSize " + CurrentRecordSize + " != " + (end - data.l);
                                bufs.push(data.slice(data.l, end));
                                ++escapecnt;
                                if (escapecnt == CommentRecordCount) {
                                    var prepped = util_1.bconcat(bufs);
                                    util_1.prep_blob(prepped, 0);
                                    parse_emf(prepped);
                                }
                            }
                            break;
                        default: throw "Escape: Unrecognized META_ESCAPE Type 0x" + EscapeFunction.toString(16);
                    }
                }
                break;
            // #region 2.3.1 Bitmap Record Types
            case 0x0940:
                { // 2.3.1.2 META_DIBBITBLT
                    var has_bitmap = h != (rt >> 8) + 3;
                    var RasterOperation = data.read_shift(4);
                    var YSrc = data.read_shift(2, "i");
                    var XSrc = data.read_shift(2, "i");
                    if (!has_bitmap)
                        data.l += 2;
                    var Height = data.read_shift(2, "i");
                    var Width = data.read_shift(2, "i");
                    var YDest = data.read_shift(2, "i");
                    var XDest = data.read_shift(2, "i");
                    var res = {
                        t: "cpy",
                        src: [[XSrc, Width], [YSrc, Height]],
                        dst: [XDest, YDest],
                        rop: RasterOperation,
                        s: Object.assign({}, state)
                    };
                    if (has_bitmap) {
                        var DIB = parse_dib(data.slice(data.l, end));
                        res.data = DIB;
                    }
                    out.push(res);
                }
                break;
            case 0x0B41:
                { // 2.3.1.3 META_DIBSTRETCHBLT
                    var has_bitmap = h != (rt >> 8) + 3;
                    var RasterOperation = data.read_shift(4);
                    var SrcHeight = data.read_shift(2, "i");
                    var SrcWidth = data.read_shift(2, "i");
                    var YSrc = data.read_shift(2, "i");
                    var XSrc = data.read_shift(2, "i");
                    if (!has_bitmap)
                        data.l += 2;
                    var DestHeight = data.read_shift(2, "i");
                    var DestWidth = data.read_shift(2, "i");
                    var YDest = data.read_shift(2, "i");
                    var XDest = data.read_shift(2, "i");
                    var res = {
                        t: "str",
                        src: [[XSrc, SrcWidth], [YSrc, SrcHeight]],
                        dst: [[XDest, DestWidth], [YDest, DestHeight]],
                        rop: RasterOperation,
                        s: Object.assign({}, state)
                    };
                    if (has_bitmap) {
                        var DIB = parse_dib(data.slice(data.l, end));
                        res.data = DIB;
                    }
                    out.push(res);
                }
                break;
            // #endregion
            // #region 2.3.3 Drawing Record Types
            case 0x0A32:
                { // 2.3.3.5 META_EXTTEXTOUT
                    var Y = data.read_shift(2);
                    var X = data.read_shift(2);
                    var StringLength = data.read_shift(2);
                    var fwOpts = data.read_shift(2); // 2.1.2.2
                    if (fwOpts & 0x06) {
                        data.l += 8; // Rectangle 2.2.2.18 (for clipping/opaquing)
                    }
                    var str = data.read_shift(StringLength, 'cpstr');
                    if (data.l < end) { /* TODO: Dx */ }
                    out.push({ t: "text", v: str, p: [X, Y], s: Object.assign({}, state) });
                    /* TODO!! */
                }
                break;
            case 0x0325: // 2.3.3.14 META_POLYLINE
            case 0x0324: // 2.3.3.15 META_POLYGON
                {
                    var nPoints = data.read_shift(2);
                    var points = [];
                    for (var i = 0; i < nPoints; ++i)
                        points.push([data.read_shift(2), data.read_shift(2)]);
                    out.push({ t: "poly", p: points, g: rt !== 0x0325, s: state });
                }
                break;
            case 0x0538:
                { // 2.3.3.16 META_POLYPOLYGON
                    var nPolygons = data.read_shift(2);
                    var polys = [];
                    var szs = [];
                    /* 2.2.2.17 PolyPolygon */
                    for (var i = 0; i < nPolygons; ++i)
                        szs[i] = data.read_shift(2);
                    for (var i = 0; i < szs.length; ++i) {
                        polys[i] = [];
                        for (var j = 0; j < szs[i]; ++j)
                            polys[i].push([data.read_shift(2), data.read_shift(2)]);
                        out.push({ t: "poly", p: polys[i], g: true, s: state });
                    }
                }
                break;
            // #endregion
            // #region 2.3.4 Object Record Types
            case 0x02FC:
                { // 2.3.4.1 META_CREATEBRUSHINDIRECT
                    var obj = {};
                    obj.Brush = {
                        Style: data.read_shift(2),
                        Color: data.read_shift(4),
                        Hatch: data.read_shift(2)
                    };
                    add_to_objects(objects, obj);
                }
                break;
            case 0x02FB:
                { // 2.3.4.2 META_CREATEFONTINDIRECT
                    var obj = {};
                    obj.Font = {};
                    /* 2.2.1.2 Font TODO!! */
                    var Height = data.read_shift(2, "i");
                    var Width = data.read_shift(2, "i");
                    var Escapement = data.read_shift(2, "i");
                    var Orientation = data.read_shift(2, "i");
                    var Weight = data.read_shift(2, "i");
                    var Italic = !!data.read_shift(1);
                    var Underline = !!data.read_shift(1);
                    var StrikeOut = !!data.read_shift(1);
                    var CharSet = data.read_shift(1);
                    var OutPrecision = data.read_shift(1);
                    var ClipPrecision = data.read_shift(1);
                    var Quality = data.read_shift(1);
                    var PitchAndFamily = data.read_shift(1);
                    var Facename = data.read_shift(32, "cstr");
                    obj.Font.Name = Facename;
                    obj.Font.Height = Height;
                    obj.Font.Weight = Weight;
                    obj.Font.Italic = Italic;
                    obj.Font.Angle = Escapement / 10;
                    add_to_objects(objects, obj);
                }
                break;
            case 0x02FA:
                { // 2.3.4.5 META_CREATEPENINDIRECT
                    var obj = {};
                    obj.Pen = {
                        Style: data.read_shift(2),
                        Width: data.read_shift(4) & 0xFF,
                        Color: data.read_shift(4)
                    };
                    add_to_objects(objects, obj);
                }
                break;
            case 0x01F0:
                { // 2.3.4.7 META_DELETEOBJECT
                    var ObjectIndex = data.read_shift(2);
                    //console.log("DELETE", ObjectIndex, objects[ObjectIndex]);
                    objects[ObjectIndex] = null;
                }
                break;
            case 0x012C:
                { // 2.3.4.9 META_SELECTCLIPREGION
                    var Region = data.read_shift(2);
                    //console.log("CLIPREGION", Region, objects[Region]);
                    //Object.assign(state, objects[Region]);
                }
                break;
            case 0x012D:
                { // 2.3.4.10 META_SELECTOBJECT
                    var ObjectIndex = data.read_shift(2);
                    //console.log("SELECT", ObjectIndex, objects[ObjectIndex]);
                    Object.assign(state, objects[ObjectIndex]);
                    // TODO!!
                }
                break;
            // #endregion
            // #region 2.3.5 State Record Types
            case 0x0416: // 2.3.5.3 META_INTERSECTCLIPRECT
                state.ClipRect = [[0, 0], [0, 0]];
                state.ClipRect[1][1] = data.read_shift(2);
                state.ClipRect[1][0] = data.read_shift(2);
                state.ClipRect[0][1] = data.read_shift(2);
                state.ClipRect[0][0] = data.read_shift(2);
                break;
            case 0x0127:
                { // 2.3.5.10 META_RESTOREDC
                    var nSavedDC = data.read_shift(2, 'i');
                    state = states[sidx = (nSavedDC >= 0 ? nSavedDC : sidx + nSavedDC)];
                }
                break;
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
                if (!Record)
                    throw "Record: Unrecognized type 0x" + rt.toString(16);
                console.log(Record);
        }
        data.l = end;
        //if(rt != 0x0626) console.log(Record);
    }
    if (rt !== 0)
        throw "Record: Last Record Type " + rt + " is not EOF type";
    return out;
};
exports.image_size_prepped_bytes = function (data) {
    var origin = [NaN, NaN], extents = [NaN, NaN];
    /* 2.3.22 META_HEADER */
    // Type (2 bytes) must be 1 or 2
    var h = data.read_shift(2);
    if (h != 1 && h != 2)
        throw "Header: Type " + h + " must be 1 or 2";
    // HeaderSize expected to be 9
    if ((h = data.read_shift(2)) != 9)
        throw "Header: HeaderSize " + h + " must be 9";
    // Version (2 bytes) 1 or 3
    h = data.read_shift(2);
    if (h != 0x0100 && h != 0x0300)
        throw "Header: Version " + h + " must be 0x0100 or 0x0300";
    data.l = 18;
    var rt = 0;
    while (data.l < data.length) {
        h = data.read_shift(4);
        var end = data.l + h * 2 - 4;
        rt = data.read_shift(2);
        if (rt == 0x0000)
            break; // META_EOF
        switch (rt) {
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
//# sourceMappingURL=wmf.js.map