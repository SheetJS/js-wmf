/*! wmf.js (C) 2020-present SheetJS LLC -- https://sheetjs.com */
import { PreppedBytes, prep_blob } from './util';
import { Action, get_actions_prepped_bytes, image_size_prepped_bytes } from './wmf'

export { draw_canvas, render_canvas } from './canvas';

export const get_actions = (data: Buffer | Uint8Array | ArrayBuffer): Action[] => {
	if(data instanceof ArrayBuffer) return get_actions(new Uint8Array(data));
	prep_blob((data as any), 0);
	return get_actions_prepped_bytes(data as PreppedBytes);
}

export const image_size = (data: Buffer | Uint8Array | ArrayBuffer): [number, number] => {
	if(data instanceof ArrayBuffer) return image_size(new Uint8Array(data));
	prep_blob((data as any), 0);
	return image_size_prepped_bytes(data as PreppedBytes);
}
