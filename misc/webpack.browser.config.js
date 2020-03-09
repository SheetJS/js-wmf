const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

const banner = '/*! wmf.js (C) 2020-present SheetJS LLC -- https://sheetjs.com */';

module.exports = {
	mode: 'development',
	entry: './misc/entry.js',
	devtool: 'source-map',
	output: {
		library: 'WMF',
		libraryTarget: 'var',
		filename: 'wmf.js'
	},
	node: { process: false },
	module: {
		rules: [
			{
				test: /\.js$/,
				use: ['source-map-loader'],
				enforce: 'pre'
			}
		]
	},
	optimization: {
		minimizer: [
			new UglifyJsPlugin({
				uglifyOptions: {
					output: { beautify: false, preamble: banner }
				}
			})
		]
	},
	plugins: [
		new webpack.BannerPlugin({ banner, raw: true, entryOnly: true })
	]
};
