/*! wmf.js (C) 2020-present SheetJS LLC -- https://sheetjs.com */
import { PreppedBytes, prep_blob } from './util';
import { Action, PlaybackDeviceContextState, get_actions_prepped_bytes } from './wmf'

export const css_color = (clr: number): string => `#${(clr & 0xFF).toString(16).padStart(2, "0")}${((clr>>8) & 0xFF).toString(16).padStart(2, "0")}${((clr>>16) & 0xFF).toString(16).padStart(2, "0")}`

export const set_ctx_state = (ctx: CanvasRenderingContext2D, state: PlaybackDeviceContextState): void => {
	if(!state) return;
	let font = "";
	if(state.Font) {
		if(state.Font.Italic) font += " italic";
		if(state.Font.Weight) font += ` ${state.Font.Weight == 700 ? "bold" : state.Font.Weight == 400 ? "" : state.Font.Weight}`;
		if(state.Font.Height < 0) font += ` ${-state.Font.Height}px`;
		else if(state.Font.Height > 0) font += ` ${state.Font.Height}px`;
		let name = state.Font.Name || "";
		if(name == "System") name = "Calibri"; // TODO: default sys font is Segoe UI
		if(name) font += ` '${name}', sans-serif`;
		ctx.font = font.trim();
	}
};

// TODO: DIB BIT ORDER?
export const render_actions_to_context = (out: Action[], ctx: CanvasRenderingContext2D) => {
	out.forEach(act => {
		ctx.save();
		set_ctx_state(ctx, act.s);
		switch(act.t) {
			case "poly":
				ctx.beginPath();
				if(act.s.Pen.Color != null) ctx.strokeStyle = css_color(act.s.Pen.Color);
				if(act.s.Pen.Width > 0) ctx.lineWidth = act.s.Pen.Width;
				if(act.s.Brush.Color != null) ctx.fillStyle = css_color(act.s.Brush.Color);
				ctx.moveTo(act.p[0][0], act.p[0][1]);
				act.p.slice(1).forEach(([x,y]) => {
					ctx.lineTo(x, y);
				});
				if(act.g) ctx.closePath();
				if(act.s.Pen.Style != 5) ctx.stroke();
				if(act.s.Brush.Style != 1) ctx.fill();
				break;
			case "text":
				if(act.s && act.s.TextColor) ctx.fillStyle = css_color(act.s.TextColor);
				if(act.s.Font.Angle != 0) {
					ctx.translate(act.p[0], act.p[1]);
					ctx.rotate(-act.s.Font.Angle * Math.PI / 180);
					ctx.fillText(act.v, 0, 0);
					ctx.translate(-act.p[0], -act.p[1]);
				}
				else ctx.fillText(act.v, act.p[0], act.p[1]);
				break;
			case "cpy": {
				// TODO: base on ROP
				const idata = ctx.getImageData(act.src[0][0], act.src[1][0], act.src[0][1], act.src[1][1]);
				ctx.putImageData(idata, act.dst[0], act.dst[1]);
			} break;
			case "str": {
				if(act.data && act.data.BitCount == 24 && act.data.ImageData) {
					const _o = new Uint8ClampedArray(act.data.Width * act.data.Height * 4);
					for(let i = 0; i < act.data.Width * act.data.Height; ++i) {
						const j = (i % act.data.Width) + act.data.Width * (act.data.Height - 1 - Math.floor(i / act.data.Width));
						_o[4*i] = act.data.ImageData[3*j+2];
						_o[4*i+1] = act.data.ImageData[3*j+1];
						_o[4*i+2] = act.data.ImageData[3*j];
						_o[4*i+3] = 255;
					}
					const idata = new ImageData(_o, act.data.Width, act.data.Height);
					ctx.putImageData(idata, act.dst[0][0], act.dst[1][0]);
				}
				// TODO: ROP et al
			}
		}
		ctx.restore();
	});
}

export const render_canvas = (out: Action[], image: HTMLCanvasElement): void => {
	let ctx: CanvasRenderingContext2D;

	/* find first action with window info */
	out.forEach(act => {
		if(ctx) return;
		if(!act.s) return;
		if(!act.s.Extent || !act.s.Origin) return;
		image.width = act.s.Extent[0] - act.s.Origin[0];
		image.height = act.s.Extent[1] - act.s.Origin[1];
		ctx = image.getContext('2d');
		ctx.save();
		ctx.fillStyle = 'rgb(255,255,255)';
		ctx.fillRect(0, 0, act.s.Extent[0] - act.s.Origin[0], act.s.Extent[1] - act.s.Origin[1])
		ctx.restore();
	});

	if(!ctx) ctx = image.getContext('2d');
	render_actions_to_context(out, ctx);
}

export const draw_canvas = (data: Buffer | Uint8Array | ArrayBuffer, image: HTMLCanvasElement): void => {
	if(data instanceof ArrayBuffer) return draw_canvas(new Uint8Array(data), image);
	prep_blob((data as any), 0);
	const out: Action[] = get_actions_prepped_bytes(data as PreppedBytes);
	return render_canvas(out, image);
};
