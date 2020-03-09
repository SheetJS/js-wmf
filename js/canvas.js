"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*! wmf.js (C) 2020-present SheetJS LLC -- https://sheetjs.com */
var util_1 = require("./util");
var wmf_1 = require("./wmf");
exports.css_color = function (clr) { return "#" + (clr & 0xFF).toString(16).padStart(2, "0") + ((clr >> 8) & 0xFF).toString(16).padStart(2, "0") + ((clr >> 16) & 0xFF).toString(16).padStart(2, "0"); };
exports.set_ctx_state = function (ctx, state) {
    if (!state)
        return;
    var font = "";
    if (state.Font) {
        if (state.Font.Italic)
            font += " italic";
        if (state.Font.Weight)
            font += " " + (state.Font.Weight == 700 ? "bold" : state.Font.Weight == 400 ? "" : state.Font.Weight);
        if (state.Font.Height < 0)
            font += " " + -state.Font.Height + "px";
        else if (state.Font.Height > 0)
            font += " " + state.Font.Height + "px";
        var name_1 = state.Font.Name || "";
        if (name_1 == "System")
            name_1 = "Calibri"; // TODO: default sys font is Segoe UI
        if (name_1)
            font += " '" + name_1 + "', sans-serif";
        ctx.font = font.trim();
    }
};
// TODO: DIB BIT ORDER?
exports.render_actions_to_context = function (out, ctx) {
    out.forEach(function (act) {
        ctx.save();
        exports.set_ctx_state(ctx, act.s);
        switch (act.t) {
            case "poly":
                ctx.beginPath();
                if (act.s.Pen.Color != null)
                    ctx.strokeStyle = exports.css_color(act.s.Pen.Color);
                if (act.s.Pen.Width > 0)
                    ctx.lineWidth = act.s.Pen.Width;
                if (act.s.Brush.Color != null)
                    ctx.fillStyle = exports.css_color(act.s.Brush.Color);
                ctx.moveTo(act.p[0][0], act.p[0][1]);
                act.p.slice(1).forEach(function (_a) {
                    var x = _a[0], y = _a[1];
                    ctx.lineTo(x, y);
                });
                if (act.g)
                    ctx.closePath();
                if (act.s.Pen.Style != 5)
                    ctx.stroke();
                if (act.s.Brush.Style != 1)
                    ctx.fill();
                break;
            case "text":
                if (act.s && act.s.TextColor)
                    ctx.fillStyle = exports.css_color(act.s.TextColor);
                if (act.s.Font.Angle != 0) {
                    ctx.translate(act.p[0], act.p[1]);
                    ctx.rotate(-act.s.Font.Angle * Math.PI / 180);
                    ctx.fillText(act.v, 0, 0);
                    ctx.translate(-act.p[0], -act.p[1]);
                }
                else
                    ctx.fillText(act.v, act.p[0], act.p[1]);
                break;
            case "cpy":
                {
                    // TODO: base on ROP
                    var idata = ctx.getImageData(act.src[0][0], act.src[1][0], act.src[0][1], act.src[1][1]);
                    ctx.putImageData(idata, act.dst[0], act.dst[1]);
                }
                break;
            case "str": {
                if (act.data && act.data.BitCount == 24 && act.data.ImageData) {
                    var _o = new Uint8ClampedArray(act.data.Width * act.data.Height * 4);
                    for (var i = 0; i < act.data.Width * act.data.Height; ++i) {
                        var j = (i % act.data.Width) + act.data.Width * (act.data.Height - 1 - Math.floor(i / act.data.Width));
                        _o[4 * i] = act.data.ImageData[3 * j + 2];
                        _o[4 * i + 1] = act.data.ImageData[3 * j + 1];
                        _o[4 * i + 2] = act.data.ImageData[3 * j];
                        _o[4 * i + 3] = 255;
                    }
                    var idata = new ImageData(_o, act.data.Width, act.data.Height);
                    ctx.putImageData(idata, act.dst[0][0], act.dst[1][0]);
                }
                // TODO: ROP et al
            }
        }
        ctx.restore();
    });
};
exports.render_canvas = function (out, image) {
    var ctx;
    /* find first action with window info */
    out.forEach(function (act) {
        if (ctx)
            return;
        if (!act.s)
            return;
        if (!act.s.Extent || !act.s.Origin)
            return;
        image.width = act.s.Extent[0] - act.s.Origin[0];
        image.height = act.s.Extent[1] - act.s.Origin[1];
        ctx = image.getContext('2d');
        ctx.save();
        ctx.fillStyle = 'rgb(255,255,255)';
        ctx.fillRect(0, 0, act.s.Extent[0] - act.s.Origin[0], act.s.Extent[1] - act.s.Origin[1]);
        ctx.restore();
    });
    if (!ctx)
        ctx = image.getContext('2d');
    exports.render_actions_to_context(out, ctx);
};
exports.draw_canvas = function (data, image) {
    if (data instanceof ArrayBuffer)
        return exports.draw_canvas(new Uint8Array(data), image);
    util_1.prep_blob(data, 0);
    var out = wmf_1.get_actions_prepped_bytes(data);
    return exports.render_canvas(out, image);
};
//# sourceMappingURL=canvas.js.map