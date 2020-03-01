import * as WMF from '../';
import * as fs from 'fs';

Buffer; // this line is required by Parcel to pull in the buffer shim

const data = fs.readFileSync("static/image1.wmf");
const domelt/*: HTMLCanvasElement*/ = document.getElementById("canvas")/* as HTMLCanvasElement*/;

const mode = window["MODE"] || "OFFSCREEN";
console.log(mode);
switch(mode) {
  case "DIRECT": {
    /* draw_canvas automatically resizes the canvas */
    WMF.draw_canvas(data, domelt);
  } break;
  case "INDIRECT": {
    const newelt = document.createElement("canvas");
    WMF.draw_canvas(data, newelt);
    /* the copy_canvas helper performs a resize of the new canvas */
    copy_canvas(domelt, newelt);
  } break;
  case "OFFSCREEN": {
    /* OffscreenCanvas requires the size beforehand */
    const size = WMF.image_size(data);
    const newelt = new OffscreenCanvas(size[0], size[1]);
    WMF.draw_canvas(data, newelt);
    copy_canvas(domelt, newelt);
  } break;
}

function copy_canvas(dst, src) {
  dst.height = src.height;
  dst.width = src.width;
  const ctxdst = dst.getContext('2d');
  const ctxsrc = src.getContext('2d');
  const imdata = ctxsrc.getImageData(0, 0, domelt.width, domelt.height);
  ctxdst.putImageData(imdata, 0, 0);
}