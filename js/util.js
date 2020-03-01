"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// ---
var has_buf = !!(typeof Buffer !== 'undefined' && typeof process !== 'undefined' && typeof process.versions !== 'undefined' && process.versions.node);
exports.has_buf = has_buf;
var Buffer_from;
exports.Buffer_from = Buffer_from;
if (typeof Buffer !== 'undefined') {
    var nbfs = !Buffer.from;
    if (!nbfs)
        try {
            Buffer.from("foo", "utf8");
        }
        catch (e) {
            nbfs = true;
        }
    exports.Buffer_from = Buffer_from = nbfs ? (function (buf, enc) { return (enc) ? new Buffer(buf, enc) : new Buffer(buf); }) : Buffer.from.bind(Buffer);
    if (!Buffer.alloc)
        Buffer.alloc = function (n) { return new Buffer(n); };
    if (!Buffer.allocUnsafe)
        Buffer.allocUnsafe = function (n) { return new Buffer(n); };
}
exports.new_raw_buf = function (len) { return has_buf ? Buffer.alloc(len) : new Array(len); };
exports.new_unsafe_buf = function (len) { return has_buf ? Buffer.allocUnsafe(len) : new Array(len); };
exports._chr = function (c) { return String.fromCharCode(c); };
exports.chr0 = /\u0000/g; // eslint-disable-line no-control-regex
exports.chr1 = /[\u0001-\u0006]/g; // eslint-disable-line no-control-regex
// ---
var read_double_le = function (b, idx) {
    var s = 1 - 2 * (b[idx + 7] >>> 7);
    var e = ((b[idx + 7] & 0x7f) << 4) + ((b[idx + 6] >>> 4) & 0x0f);
    var m = (b[idx + 6] & 0x0f);
    for (var i = 5; i >= 0; --i)
        m = m * 256 + b[idx + i];
    if (e == 0x7ff)
        return m == 0 ? (s * Infinity) : NaN;
    if (e == 0)
        e = -1022;
    else {
        e -= 1023;
        m += Math.pow(2, 52);
    }
    return s * Math.pow(2, e - 52) * m;
};
var write_double_le = function (b, v, idx) {
    var bs = ((((v < 0) || (1 / v == -Infinity)) ? 1 : 0) << 7);
    var e = 0, m = 0;
    var av = bs ? (-v) : v;
    if (!isFinite(av)) {
        e = 0x7ff;
        m = isNaN(v) ? 0x6969 : 0;
    }
    else if (av == 0)
        e = m = 0;
    else {
        e = Math.floor(Math.log(av) / Math.LN2);
        m = av * Math.pow(2, 52 - e);
        if ((e <= -1023) && (!isFinite(m) || (m < Math.pow(2, 52)))) {
            e = -1022;
        }
        else {
            m -= Math.pow(2, 52);
            e += 1023;
        }
    }
    for (var i = 0; i <= 5; ++i, m /= 256)
        b[idx + i] = m & 0xff;
    b[idx + 6] = ((e & 0x0f) << 4) | (m & 0xf);
    b[idx + 7] = (e >> 4) | bs;
};
var __toBuffer = function (bufs /*:Array<Array<RawBytes> >*/) {
    var x = [];
    for (var i = 0; i < bufs[0].length; ++i)
        if (bufs[0][i])
            for (var j = 0, L = bufs[0][i].length; j < L; j += 10240)
                x.push.apply(x, bufs[0][i].slice(j, j + 10240));
    return x;
};
var ___toBuffer = __toBuffer;
var __readUInt8 = function (b, idx) { return b[idx]; };
var __readUInt16LE = function (b, idx) { return (b[idx + 1] * (1 << 8)) + b[idx]; };
var __readInt16LE = function (b, idx) { var u = (b[idx + 1] * (1 << 8)) + b[idx]; return (u < 0x8000) ? u : ((0xffff - u + 1) * -1); };
var __readUInt32LE = function (b, idx) { return b[idx + 3] * (1 << 24) + (b[idx + 2] << 16) + (b[idx + 1] << 8) + b[idx]; };
var __readInt32LE = function (b, idx) { return (b[idx + 3] << 24) | (b[idx + 2] << 16) | (b[idx + 1] << 8) | b[idx]; };
var __readInt32BE = function (b, idx) { return (b[idx] << 24) | (b[idx + 1] << 16) | (b[idx + 2] << 8) | b[idx + 3]; };
var __utf16le = function (b, s, e) {
    var ss = [];
    for (var i = s; i < e; i += 2)
        ss.push(String.fromCharCode(__readUInt16LE(b, i)));
    return ss.join("").replace(exports.chr0, '');
};
exports.__utf16le = __utf16le;
var ___utf16le = __utf16le;
var __hexlify = function (b /*:RawBytes|CFBlob*/, s, l) { var ss = []; for (var i = s; i < s + l; ++i)
    ss.push(("0" + b[i].toString(16)).slice(-2)); return ss.join(""); };
var ___hexlify = __hexlify;
var __utf8 = function (b /*:RawBytes|CFBlob*/, s, e) { var ss = []; for (var i = s; i < e; i++)
    ss.push(String.fromCharCode(__readUInt8(b, i))); return ss.join(""); };
var ___utf8 = __utf8;
var __lpstr = function (b /*:RawBytes|CFBlob*/, i) { var len = __readUInt32LE(b, i); return len > 0 ? __utf8(b, i + 4, i + 4 + len - 1) : ""; };
var ___lpstr = __lpstr;
var __cpstr = function (b /*:RawBytes|CFBlob*/, i) { var len = __readUInt32LE(b, i); return len > 0 ? __utf8(b, i + 4, i + 4 + len - 1) : ""; };
var ___cpstr = __cpstr;
var __lpwstr = function (b /*:RawBytes|CFBlob*/, i) { var len = 2 * __readUInt32LE(b, i); return len > 0 ? __utf8(b, i + 4, i + 4 + len - 1) : ""; };
var ___lpwstr = __lpwstr;
var __lpp4, ___lpp4;
__lpp4 = ___lpp4 = function lpp4_(b /*:RawBytes|CFBlob*/, i) { var len = __readUInt32LE(b, i); return len > 0 ? __utf16le(b, i + 4, i + 4 + len) : ""; };
var ___8lpp4 = function (b /*:RawBytes|CFBlob*/, i) { var len = __readUInt32LE(b, i); return len > 0 ? __utf8(b, i + 4, i + 4 + len) : ""; };
var __8lpp4 = ___8lpp4;
var ___double = function (b /*:RawBytes|CFBlob*/, idx) { return read_double_le(b, idx); };
var __double = ___double;
if (has_buf) {
    exports.__utf16le = __utf16le = function (b /*:RawBytes|CFBlob*/, s, e) { return (!Buffer.isBuffer(b)) ? ___utf16le(b, s, e) : b.toString('utf16le', s, e).replace(exports.chr0, ''); };
    __hexlify = function (b /*:RawBytes|CFBlob*/, s, l) { return Buffer.isBuffer(b) ? b.toString('hex', s, s + l) : ___hexlify(b, s, l); };
    __lpstr = function (b /*:RawBytes|CFBlob*/, i) { if (!Buffer.isBuffer(b))
        return ___lpstr(b, i); var len = b.readUInt32LE(i); return len > 0 ? b.toString('utf8', i + 4, i + 4 + len - 1) : ""; };
    __cpstr = function (b /*:RawBytes|CFBlob*/, i) { if (!Buffer.isBuffer(b))
        return ___cpstr(b, i); var len = b.readUInt32LE(i); return len > 0 ? b.toString('utf8', i + 4, i + 4 + len - 1) : ""; };
    __lpwstr = function (b /*:RawBytes|CFBlob*/, i) { if (!Buffer.isBuffer(b))
        return ___lpwstr(b, i); var len = 2 * b.readUInt32LE(i); return b.toString('utf16le', i + 4, i + 4 + len - 1); };
    __lpp4 = function (b /*:RawBytes|CFBlob*/, i) { if (!Buffer.isBuffer(b))
        return ___lpp4(b, i); var len = b.readUInt32LE(i); return b.toString('utf16le', i + 4, i + 4 + len); };
    __8lpp4 = function (b /*:RawBytes|CFBlob*/, i) { if (!Buffer.isBuffer(b))
        return ___8lpp4(b, i); var len = b.readUInt32LE(i); return b.toString('utf8', i + 4, i + 4 + len); };
    __utf8 = function (b /*:RawBytes|CFBlob*/, s, e) { return (Buffer.isBuffer(b)) ? b.toString('utf8', s, e) : ___utf8(b, s, e); };
    __toBuffer = function (bufs) { return (bufs[0].length > 0 && Buffer.isBuffer(bufs[0][0])) ? Buffer.concat(bufs[0]) : ___toBuffer(bufs); };
    __double = function (b /*:RawBytes|CFBlob*/, i) { return (Buffer.isBuffer(b)) ? b.readDoubleLE(i) : ___double(b, i); };
}
function ReadShift(size, t) {
    var o = "", oI = 0, oR, w, vv, i, loc;
    var oo = [];
    switch (t) {
        case 'dbcs':
            loc = this.l;
            if (has_buf && Buffer.isBuffer(this))
                o = this.slice(this.l, this.l + 2 * size).toString("utf16le");
            else
                for (i = 0; i < size; ++i) {
                    o += String.fromCharCode(__readUInt16LE(this, loc));
                    loc += 2;
                }
            size *= 2;
            break;
        case 'utf8':
            o = __utf8(this, this.l, this.l + size);
            break;
        case 'utf16le':
            size *= 2;
            o = __utf16le(this, this.l, this.l + size);
            break;
        case 'wstr':
            return ReadShift.call(this, size, 'dbcs');
        /* [MS-OLEDS] 2.1.4 LengthPrefixedAnsiString */
        case 'lpstr-ansi':
            o = __lpstr(this, this.l);
            size = 4 + __readUInt32LE(this, this.l);
            break;
        case 'lpstr-cp':
            o = __cpstr(this, this.l);
            size = 4 + __readUInt32LE(this, this.l);
            break;
        /* [MS-OLEDS] 2.1.5 LengthPrefixedUnicodeString */
        case 'lpwstr':
            o = __lpwstr(this, this.l);
            size = 4 + 2 * __readUInt32LE(this, this.l);
            break;
        /* [MS-OFFCRYPTO] 2.1.2 Length-Prefixed Padded Unicode String (UNICODE-LP-P4) */
        case 'lpp4':
            size = 4 + __readUInt32LE(this, this.l);
            o = __lpp4(this, this.l);
            if (size & 0x02)
                size += 2;
            break;
        /* [MS-OFFCRYPTO] 2.1.3 Length-Prefixed UTF-8 String (UTF-8-LP-P4) */
        case '8lpp4':
            size = 4 + __readUInt32LE(this, this.l);
            o = __8lpp4(this, this.l);
            if (size & 0x03)
                size += 4 - (size & 0x03);
            break;
        case 'cstr':
            size = 0;
            o = "";
            while ((w = __readUInt8(this, this.l + size++)) !== 0)
                oo.push(String.fromCharCode(w));
            o = oo.join("");
            break;
        case '_wstr':
            size = 0;
            o = "";
            while ((w = __readUInt16LE(this, this.l + size)) !== 0) {
                oo.push(String.fromCharCode(w));
                size += 2;
            }
            size += 2;
            o = oo.join("");
            break;
        /* sbcs and dbcs support continue records in the SST way TODO codepages */
        case 'dbcs-cont':
            o = "";
            loc = this.l;
            for (i = 0; i < size; ++i) {
                if (this.lens && this.lens.indexOf(loc) !== -1) {
                    w = __readUInt8(this, loc);
                    this.l = loc + 1;
                    vv = ReadShift.call(this, size - i, w ? 'dbcs-cont' : 'sbcs-cont');
                    return oo.join("") + vv;
                }
                oo.push(String.fromCharCode(__readUInt16LE(this, loc)));
                loc += 2;
            }
            o = oo.join("");
            size *= 2;
            break;
        case 'cpstr':
        /* falls through */
        case 'sbcs-cont':
            o = "";
            loc = this.l;
            for (i = 0; i != size; ++i) {
                if (this.lens && this.lens.indexOf(loc) !== -1) {
                    w = __readUInt8(this, loc);
                    this.l = loc + 1;
                    vv = ReadShift.call(this, size - i, w ? 'dbcs-cont' : 'sbcs-cont');
                    return oo.join("") + vv;
                }
                oo.push(String.fromCharCode(__readUInt8(this, loc)));
                loc += 1;
            }
            o = oo.join("");
            break;
        default:
            switch (size) {
                case 1:
                    oI = __readUInt8(this, this.l);
                    this.l++;
                    return oI;
                case 2:
                    oI = (t === 'i' ? __readInt16LE : __readUInt16LE)(this, this.l);
                    this.l += 2;
                    return oI;
                case 4:
                case -4:
                    if (t === 'i' || ((this[this.l + 3] & 0x80) === 0)) {
                        oI = ((size > 0) ? __readInt32LE : __readInt32BE)(this, this.l);
                        this.l += 4;
                        return oI;
                    }
                    else {
                        oR = __readUInt32LE(this, this.l);
                        this.l += 4;
                    }
                    return oR;
                case 8:
                case -8:
                    if (t === 'f') {
                        if (size == 8)
                            oR = __double(this, this.l);
                        else
                            oR = __double([this[this.l + 7], this[this.l + 6], this[this.l + 5], this[this.l + 4], this[this.l + 3], this[this.l + 2], this[this.l + 1], this[this.l + 0]], 0);
                        this.l += 8;
                        return oR;
                    }
                    else
                        size = 8;
                /* falls through */
                case 16:
                    o = __hexlify(this, this.l, size);
                    break;
            }
    }
    this.l += size;
    return o;
}
exports.ReadShift = ReadShift;
var __writeUInt32LE = function (b /*:RawBytes|CFBlob*/, val, idx) { b[idx] = (val & 0xFF); b[idx + 1] = ((val >>> 8) & 0xFF); b[idx + 2] = ((val >>> 16) & 0xFF); b[idx + 3] = ((val >>> 24) & 0xFF); };
var __writeInt32LE = function (b /*:RawBytes|CFBlob*/, val, idx) { b[idx] = (val & 0xFF); b[idx + 1] = ((val >> 8) & 0xFF); b[idx + 2] = ((val >> 16) & 0xFF); b[idx + 3] = ((val >> 24) & 0xFF); };
var __writeUInt16LE = function (b /*:RawBytes|CFBlob*/, val, idx) { b[idx] = (val & 0xFF); b[idx + 1] = ((val >>> 8) & 0xFF); };
function WriteShift(t, val, f) {
    var size = 0, i = 0;
    if (f === 'dbcs') {
        if (typeof val !== 'string')
            throw new Error("expected string");
        for (i = 0; i != val.length; ++i)
            __writeUInt16LE(this, val.charCodeAt(i), this.l + 2 * i);
        size = 2 * val.length;
    }
    else if (f === 'sbcs') {
        {
            val = val.replace(/[^\x00-\x7F]/g, "_"); // eslint-disable-line no-control-regex
            for (i = 0; i != val.length; ++i)
                this[this.l + i] = (val.charCodeAt(i) & 0xFF);
        }
        size = val.length;
    }
    else if (f === 'hex') {
        for (; i < t; ++i) {
            this[this.l++] = (parseInt(val.slice(2 * i, 2 * i + 2), 16) || 0);
        }
        return this;
    }
    else if (f === 'utf16le') {
        /*:: if(typeof val !== "string") throw new Error("unreachable"); */
        var end = Math.min(this.l + t, this.length);
        for (i = 0; i < Math.min(val.length, t); ++i) {
            var cc = val.charCodeAt(i);
            this[this.l++] = (cc & 0xff);
            this[this.l++] = (cc >> 8);
        }
        while (this.l < end)
            this[this.l++] = 0;
        return this;
    }
    else if (typeof val === 'number')
        switch (t) {
            case 1:
                size = 1;
                this[this.l] = val & 0xFF;
                break;
            case 2:
                size = 2;
                this[this.l] = val & 0xFF;
                val >>>= 8;
                this[this.l + 1] = val & 0xFF;
                break;
            case 3:
                size = 3;
                this[this.l] = val & 0xFF;
                val >>>= 8;
                this[this.l + 1] = val & 0xFF;
                val >>>= 8;
                this[this.l + 2] = val & 0xFF;
                break;
            case 4:
                size = 4;
                __writeUInt32LE(this, val, this.l);
                break;
            case 8:
                size = 8;
                if (f === 'f') {
                    write_double_le(this, val, this.l);
                    break;
                }
            /* falls through */
            case 16: break;
            case -4:
                size = 4;
                __writeInt32LE(this, val, this.l);
                break;
        }
    this.l += size;
    return this;
}
exports.WriteShift = WriteShift;
function CheckField(hexstr, fld) {
    var m = __hexlify(this, this.l, hexstr.length >> 1);
    if (m !== hexstr)
        throw new Error(fld + 'Expected ' + hexstr + ' saw ' + m);
    this.l += hexstr.length >> 1;
}
exports.CheckField = CheckField;
var prep_blob = function (blob, pos) {
    blob.l = pos;
    blob.read_shift = ReadShift;
    blob.chk = CheckField;
    blob.write_shift = WriteShift;
};
exports.prep_blob = prep_blob;
var new_buf = function (sz) {
    var o = exports.new_raw_buf(sz);
    prep_blob(o, 0);
    return o;
};
exports.new_buf = new_buf;
// ---
var __bconcat = function (bufs /*:Array<RawBytes>*/) {
    var is_all_arrays = true;
    for (var w = 0; w < bufs.length; ++w)
        if (!Array.isArray(bufs[w]))
            is_all_arrays = false;
    if (is_all_arrays)
        return [].concat.apply([], bufs);
    var maxlen = 0, i = 0;
    for (i = 0; i < bufs.length; ++i)
        maxlen += bufs[i].length;
    var o = new Uint8Array(maxlen);
    for (i = 0, maxlen = 0; i < bufs.length; maxlen += bufs[i].length, ++i)
        o.set(bufs[i], maxlen);
    return o;
};
var bconcat = __bconcat;
exports.bconcat = bconcat;
if (has_buf)
    exports.bconcat = bconcat = function (bufs) { return Buffer.isBuffer(bufs[0]) ? Buffer.concat(bufs) : [].concat.apply([], bufs); };
//# sourceMappingURL=util.js.map