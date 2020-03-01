/*! wmf.js (C) 2020-present SheetJS LLC -- https://sheetjs.com */
export type RawBytes = Buffer | number[];

export type PreppedBytes = RawBytes & {
  l: number;
  read_shift(size: 1): number;
  read_shift(size: 2): number;
  read_shift(size: 2, t: "i"): number;
  read_shift(size: 4): number;
  read_shift(size: 4, t: "i"): number;
  read_shift(size: 8, t: "f"): number;
  read_shift(size: number, t: "cstr"): string;
  read_shift(size: number, t: "cpstr"): string;
  read_shift(size: number, t: "_wstr"): string;
  read_shift(size: number, t?: string): number|string;
  chk(hexstr: string, fld: string): void;
  write_shift(t: number, val: string|number, f?: string): void;
};

// ---

const has_buf = !!(typeof Buffer !== 'undefined' && typeof process !== 'undefined' && typeof process.versions !== 'undefined' && process.versions.node);

let Buffer_from: typeof Buffer.from;

if(typeof Buffer !== 'undefined') {
  let nbfs = !Buffer.from;
	if(!nbfs) try {
    Buffer.from("foo", "utf8");
  } catch(e) { nbfs = true; }
	Buffer_from = nbfs ? ((buf, enc?: string): Buffer => (enc) ? new Buffer(buf, (enc as BufferEncoding)) : new Buffer(buf)) : Buffer.from.bind(Buffer);
	if(!Buffer.alloc) Buffer.alloc = function(n: number): Buffer { return new Buffer(n); };
	if(!Buffer.allocUnsafe) Buffer.allocUnsafe = function(n: number): Buffer { return new Buffer(n); };
}

export { Buffer_from, has_buf };

export const new_raw_buf = (len: number): Buffer|number[] => has_buf ? Buffer.alloc(len) : new Array(len);

export const new_unsafe_buf = (len: number): Buffer|number[] => has_buf ? Buffer.allocUnsafe(len) : new Array(len);

export const _chr = (c: number): string => String.fromCharCode(c);

export const chr0 = /\u0000/g; // eslint-disable-line no-control-regex
export const chr1 = /[\u0001-\u0006]/g; // eslint-disable-line no-control-regex

// ---

const read_double_le = (b: RawBytes, idx: number): number => {
	const s = 1 - 2 * (b[idx + 7] >>> 7);
	let e = ((b[idx + 7] & 0x7f) << 4) + ((b[idx + 6] >>> 4) & 0x0f);
	let m = (b[idx+6]&0x0f);
	for(let i = 5; i >= 0; --i) m = m * 256 + b[idx + i];
	if(e == 0x7ff) return m == 0 ? (s * Infinity) : NaN;
	if(e == 0) e = -1022;
	else { e -= 1023; m += Math.pow(2,52); }
	return s * Math.pow(2, e - 52) * m;
};

const write_double_le = (b: RawBytes, v: number, idx: number): void => {
	const bs = ((((v < 0) || (1/v == -Infinity)) ? 1 : 0) << 7);
	let e = 0, m = 0;
	const av = bs ? (-v) : v;
	if(!isFinite(av)) { e = 0x7ff; m = isNaN(v) ? 0x6969 : 0; }
	else if(av == 0) e = m = 0;
	else {
		e = Math.floor(Math.log(av) / Math.LN2);
		m = av * Math.pow(2, 52 - e);
		if((e <= -1023) && (!isFinite(m) || (m < Math.pow(2,52)))) { e = -1022; }
		else { m -= Math.pow(2,52); e+=1023; }
	}
	for(let i = 0; i <= 5; ++i, m/=256) b[idx + i] = m & 0xff;
	b[idx + 6] = ((e & 0x0f) << 4) | (m & 0xf);
	b[idx + 7] = (e >> 4) | bs;
};

let __toBuffer = (bufs/*:Array<Array<RawBytes> >*/): RawBytes => {
	const x: number[] =[];
	for(let i=0; i<bufs[0].length; ++i) if(bufs[0][i])
		for(let j=0, L=bufs[0][i].length; j<L; j+=10240) x.push(...bufs[0][i].slice(j,j+10240));
	return x;
};
const ___toBuffer = __toBuffer;

const __readUInt8 = (b: RawBytes, idx: number): number => b[idx];
const __readUInt16LE = (b: RawBytes, idx: number): number => (b[idx+1]*(1<<8))+b[idx];
const __readInt16LE = (b: RawBytes, idx: number): number => { const u = (b[idx+1]*(1<<8))+b[idx]; return (u < 0x8000) ? u : ((0xffff - u + 1) * -1); };
const __readUInt32LE = (b: RawBytes, idx: number): number => b[idx+3]*(1<<24)+(b[idx+2]<<16)+(b[idx+1]<<8)+b[idx];
const __readInt32LE = (b: RawBytes, idx: number): number => (b[idx+3]<<24)|(b[idx+2]<<16)|(b[idx+1]<<8)|b[idx];
const __readInt32BE = (b: RawBytes, idx: number): number => (b[idx]<<24)|(b[idx+1]<<16)|(b[idx+2]<<8)|b[idx+3];

let __utf16le = (b: RawBytes, s: number, e: number): string => {
	const ss: string[] = [];
	for(let i=s; i<e; i+=2) ss.push(String.fromCharCode(__readUInt16LE(b,i)));
	return ss.join("").replace(chr0,'');
};
const ___utf16le = __utf16le;
let __hexlify = function(b/*:RawBytes|CFBlob*/,s: number,l: number): string { const ss: string[] = []; for(let i=s; i<s+l; ++i) ss.push(("0" + b[i].toString(16)).slice(-2)); return ss.join(""); };
const ___hexlify = __hexlify;
let __utf8 = function(b/*:RawBytes|CFBlob*/,s: number,e: number): string { const ss=[]; for(let i=s; i<e; i++) ss.push(String.fromCharCode(__readUInt8(b,i))); return ss.join(""); };
const ___utf8 = __utf8;
let __lpstr = function(b/*:RawBytes|CFBlob*/,i: number): string { const len = __readUInt32LE(b,i); return len > 0 ? __utf8(b, i+4,i+4+len-1) : "";};
const ___lpstr = __lpstr;
let __cpstr = function(b/*:RawBytes|CFBlob*/,i: number): string { const len = __readUInt32LE(b,i); return len > 0 ? __utf8(b, i+4,i+4+len-1) : "";};
const ___cpstr = __cpstr;
let __lpwstr = function(b/*:RawBytes|CFBlob*/,i: number): string { const len = 2*__readUInt32LE(b,i); return len > 0 ? __utf8(b, i+4,i+4+len-1) : "";};
const ___lpwstr = __lpwstr;
let __lpp4, ___lpp4;
__lpp4 = ___lpp4 = function lpp4_(b/*:RawBytes|CFBlob*/,i: number): string { const len = __readUInt32LE(b,i); return len > 0 ? __utf16le(b, i+4,i+4+len) : "";};
const ___8lpp4 = function(b/*:RawBytes|CFBlob*/,i: number): string { const len = __readUInt32LE(b,i); return len > 0 ? __utf8(b, i+4,i+4+len) : "";};
let __8lpp4 = ___8lpp4;
const ___double = (b/*:RawBytes|CFBlob*/, idx: number): number => read_double_le(b, idx);
let __double = ___double;

if(has_buf) {
	__utf16le = (b/*:RawBytes|CFBlob*/,s: number,e: number): string => (!Buffer.isBuffer(b)) ?  ___utf16le(b,s,e) : b.toString('utf16le',s,e).replace(chr0,'');
	__hexlify = (b/*:RawBytes|CFBlob*/,s: number,l: number): string => Buffer.isBuffer(b) ? b.toString('hex',s,s+l) : ___hexlify(b,s,l);
	__lpstr = (b/*:RawBytes|CFBlob*/, i: number): string => { if(!Buffer.isBuffer(b)) return ___lpstr(b, i); const len = b.readUInt32LE(i); return len > 0 ? b.toString('utf8',i+4,i+4+len-1) : "";};
	__cpstr = (b/*:RawBytes|CFBlob*/, i: number): string => { if(!Buffer.isBuffer(b)) return ___cpstr(b, i); const len = b.readUInt32LE(i); return len > 0 ? b.toString('utf8',i+4,i+4+len-1) : "";};
	__lpwstr = (b/*:RawBytes|CFBlob*/, i: number): string => { if(!Buffer.isBuffer(b)) return ___lpwstr(b, i); const len = 2*b.readUInt32LE(i); return b.toString('utf16le',i+4,i+4+len-1);};
	__lpp4 = (b/*:RawBytes|CFBlob*/, i: number): string => { if(!Buffer.isBuffer(b)) return ___lpp4(b, i); const len = b.readUInt32LE(i); return b.toString('utf16le',i+4,i+4+len);};
	__8lpp4 = (b/*:RawBytes|CFBlob*/, i: number): string => { if(!Buffer.isBuffer(b)) return ___8lpp4(b, i); const len = b.readUInt32LE(i); return b.toString('utf8',i+4,i+4+len);};
	__utf8 = (b/*:RawBytes|CFBlob*/, s: number, e: number): string => (Buffer.isBuffer(b)) ? b.toString('utf8',s,e) : ___utf8(b,s,e);
	__toBuffer = (bufs): RawBytes => (bufs[0].length > 0 && Buffer.isBuffer(bufs[0][0])) ? Buffer.concat(bufs[0]) : ___toBuffer(bufs);
	__double = (b/*:RawBytes|CFBlob*/, i: number): number => (Buffer.isBuffer(b)) ? b.readDoubleLE(i) : ___double(b,i);
}

function ReadShift(size: 1): number;
function ReadShift(size: 2): number;
function ReadShift(size: 2, t: "i"): number;
function ReadShift(size: 4): number;
function ReadShift(size: 4, t: "i"): number;
function ReadShift(size: 8, t: "f"): number;
function ReadShift(size: number, t: "cstr"): string;
function ReadShift(size: number, t: "cpstr"): string;
function ReadShift(size: number, t: "_wstr"): string;
function ReadShift(size: number, t?: string): number|string {
	let o="", oI = 0, oR, w, vv, i, loc;
	const oo = [];
	switch(t) {
		case 'dbcs':
			loc = this.l;
			if(has_buf && Buffer.isBuffer(this)) o = this.slice(this.l, this.l+2*size).toString("utf16le");
			else for(i = 0; i < size; ++i) { o+=String.fromCharCode(__readUInt16LE(this, loc)); loc+=2; }
			size *= 2;
			break;

		case 'utf8': o = __utf8(this, this.l, this.l + size); break;
		case 'utf16le': size *= 2; o = __utf16le(this, this.l, this.l + size); break;

		case 'wstr':
			return ReadShift.call(this, size, 'dbcs');

		/* [MS-OLEDS] 2.1.4 LengthPrefixedAnsiString */
		case 'lpstr-ansi': o = __lpstr(this, this.l); size = 4 + __readUInt32LE(this, this.l); break;
		case 'lpstr-cp': o = __cpstr(this, this.l); size = 4 + __readUInt32LE(this, this.l); break;
		/* [MS-OLEDS] 2.1.5 LengthPrefixedUnicodeString */
		case 'lpwstr': o = __lpwstr(this, this.l); size = 4 + 2 * __readUInt32LE(this, this.l); break;
		/* [MS-OFFCRYPTO] 2.1.2 Length-Prefixed Padded Unicode String (UNICODE-LP-P4) */
		case 'lpp4': size = 4 +  __readUInt32LE(this, this.l); o = __lpp4(this, this.l); if(size & 0x02) size += 2; break;
		/* [MS-OFFCRYPTO] 2.1.3 Length-Prefixed UTF-8 String (UTF-8-LP-P4) */
		case '8lpp4': size = 4 +  __readUInt32LE(this, this.l); o = __8lpp4(this, this.l); if(size & 0x03) size += 4 - (size & 0x03); break;

		case 'cstr': size = 0; o = "";
			while((w=__readUInt8(this, this.l + size++))!==0) oo.push(String.fromCharCode(w));
			o = oo.join(""); break;
		case '_wstr': size = 0; o = "";
			while((w=__readUInt16LE(this,this.l +size))!==0){oo.push(String.fromCharCode(w));size+=2;}
			size+=2; o = oo.join(""); break;

		/* sbcs and dbcs support continue records in the SST way TODO codepages */
		case 'dbcs-cont': o = ""; loc = this.l;
			for(i = 0; i < size; ++i) {
				if(this.lens && this.lens.indexOf(loc) !== -1) {
					w = __readUInt8(this, loc);
					this.l = loc + 1;
					vv = ReadShift.call(this, size-i, w ? 'dbcs-cont' : 'sbcs-cont');
					return oo.join("") + vv;
				}
				oo.push(String.fromCharCode(__readUInt16LE(this, loc)));
				loc+=2;
			} o = oo.join(""); size *= 2; break;

		case 'cpstr':
		/* falls through */
		case 'sbcs-cont': o = ""; loc = this.l;
			for(i = 0; i != size; ++i) {
				if(this.lens && this.lens.indexOf(loc) !== -1) {
					w = __readUInt8(this, loc);
					this.l = loc + 1;
					vv = ReadShift.call(this, size-i, w ? 'dbcs-cont' : 'sbcs-cont');
					return oo.join("") + vv;
				}
				oo.push(String.fromCharCode(__readUInt8(this, loc)));
				loc+=1;
			} o = oo.join(""); break;

		default:
	switch(size) {
		case 1: oI = __readUInt8(this, this.l); this.l++; return oI;
		case 2: oI = (t === 'i' ? __readInt16LE : __readUInt16LE)(this, this.l); this.l += 2; return oI;
		case 4: case -4:
			if(t === 'i' || ((this[this.l+3] & 0x80)===0)) { oI = ((size > 0) ? __readInt32LE : __readInt32BE)(this, this.l); this.l += 4; return oI; }
			else { oR = __readUInt32LE(this, this.l); this.l += 4; } return oR;
		case 8: case -8:
			if(t === 'f') {
				if(size == 8) oR = __double(this, this.l);
				else oR = __double([this[this.l+7],this[this.l+6],this[this.l+5],this[this.l+4],this[this.l+3],this[this.l+2],this[this.l+1],this[this.l+0]], 0);
				this.l += 8; return oR;
			} else size = 8;
		/* falls through */
		case 16: o = __hexlify(this, this.l, size); break;
	}}
	this.l+=size; return o;
}

const __writeUInt32LE = (b/*:RawBytes|CFBlob*/, val: number, idx: number): void => { b[idx] = (val & 0xFF); b[idx+1] = ((val >>> 8) & 0xFF); b[idx+2] = ((val >>> 16) & 0xFF); b[idx+3] = ((val >>> 24) & 0xFF); };
const __writeInt32LE  = (b/*:RawBytes|CFBlob*/, val: number, idx: number): void => { b[idx] = (val & 0xFF); b[idx+1] = ((val >> 8) & 0xFF); b[idx+2] = ((val >> 16) & 0xFF); b[idx+3] = ((val >> 24) & 0xFF); };
const __writeUInt16LE = (b/*:RawBytes|CFBlob*/, val: number, idx: number): void => { b[idx] = (val & 0xFF); b[idx+1] = ((val >>> 8) & 0xFF); };

function WriteShift(t: number, val: string|number, f?: string): void {
	let size = 0, i = 0;
	if(f === 'dbcs') {
		if(typeof val !== 'string') throw new Error("expected string");
		for(i = 0; i != val.length; ++i) __writeUInt16LE(this, val.charCodeAt(i), this.l + 2 * i);
		size = 2 * val.length;
	} else if(f === 'sbcs') {
		{
			val = (val as string).replace(/[^\x00-\x7F]/g, "_"); // eslint-disable-line no-control-regex
			for(i = 0; i != val.length; ++i) this[this.l + i] = (val.charCodeAt(i) & 0xFF);
		}
		size = val.length;
	} else if(f === 'hex') {
		for(; i < t; ++i) {
			this[this.l++] = (parseInt((val as string).slice(2*i, 2*i+2), 16)||0);
		} return this;
	} else if(f === 'utf16le') {
			/*:: if(typeof val !== "string") throw new Error("unreachable"); */
			const end: number = Math.min(this.l + t, this.length);
			for(i = 0; i < Math.min((val as string).length, t); ++i) {
				const cc = (val as string).charCodeAt(i);
				this[this.l++] = (cc & 0xff);
				this[this.l++] = (cc >> 8);
			}
			while(this.l < end) this[this.l++] = 0;
			return this;
	} else if(typeof val === 'number') switch(t) {
		case  1: size = 1; this[this.l] = val&0xFF; break;
		case  2: size = 2; this[this.l] = val&0xFF; val >>>= 8; this[this.l+1] = val&0xFF; break;
		case  3: size = 3; this[this.l] = val&0xFF; val >>>= 8; this[this.l+1] = val&0xFF; val >>>= 8; this[this.l+2] = val&0xFF; break;
		case  4: size = 4; __writeUInt32LE(this, val, this.l); break;
		case  8: size = 8; if(f === 'f') { write_double_le(this, val, this.l); break; }
		/* falls through */
		case 16: break;
		case -4: size = 4; __writeInt32LE(this, val, this.l); break;
	}
	this.l += size; return this;
}

function CheckField(hexstr: string, fld: string): void {
	const m = __hexlify(this,this.l,hexstr.length>>1);
	if(m !== hexstr) throw new Error(fld + 'Expected ' + hexstr + ' saw ' + m);
	this.l += hexstr.length>>1;
}

const prep_blob = (blob: PreppedBytes, pos: number): void => {
	blob.l = pos;
	blob.read_shift = ReadShift;
	blob.chk = CheckField;
	blob.write_shift = WriteShift;
};

const new_buf = (sz: number): PreppedBytes => {
	const o = (new_raw_buf(sz) as PreppedBytes);
	prep_blob(o, 0);
	return o;
};

export { ReadShift, WriteShift, CheckField, prep_blob, new_buf, __utf16le };

// ---

const __bconcat = function(bufs/*:Array<RawBytes>*/): Buffer | Uint8Array | number[] {
  let is_all_arrays = true;
  for(let w = 0; w < bufs.length; ++w) if(!Array.isArray(bufs[w])) is_all_arrays = false;
	if(is_all_arrays) return [].concat(...bufs);
	let maxlen = 0, i = 0;
	for(i = 0; i < bufs.length; ++i) maxlen += bufs[i].length;
	const o = new Uint8Array(maxlen);
	for(i = 0, maxlen = 0; i < bufs.length; maxlen += bufs[i].length, ++i) o.set(bufs[i], maxlen);
	return o;
};
let bconcat = __bconcat;

if(has_buf) bconcat = (bufs): Buffer | Uint8Array | number[] => Buffer.isBuffer(bufs[0]) ? Buffer.concat(bufs) : [].concat(...bufs);

export { bconcat };
