const fs = require("fs");
const { createCanvas, createImageData } = require("canvas");
const WMF = require("../");

/* WMF uses ImageData -- make it visible to the library */
global.ImageData = createImageData;

/* read data */
const data = fs.readFileSync(process.argv[2] || "./static/image1.wmf");

/* create canvas */
const size = WMF.image_size(data);
const canvas = createCanvas(size[0], size[1]);

/* do it! */
WMF.draw_canvas(data, canvas);

/* export to file */
const res = canvas.toBuffer("image/png");
fs.writeFileSync("out.png", res);