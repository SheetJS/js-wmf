"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*! wmf.js (C) 2020-present SheetJS LLC -- https://sheetjs.com */
var util_1 = require("./util");
var wmf_1 = require("./wmf");
var canvas_1 = require("./canvas");
exports.draw_canvas = canvas_1.draw_canvas;
exports.render_canvas = canvas_1.render_canvas;
exports.get_actions = function (data) {
    if (data instanceof ArrayBuffer)
        return exports.get_actions(new Uint8Array(data));
    util_1.prep_blob(data, 0);
    return wmf_1.get_actions_prepped_bytes(data);
};
exports.image_size = function (data) {
    if (data instanceof ArrayBuffer)
        return exports.image_size(new Uint8Array(data));
    util_1.prep_blob(data, 0);
    return wmf_1.image_size_prepped_bytes(data);
};
//# sourceMappingURL=index.js.map