const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
var nodeExternals = require('webpack-node-externals');

const banner = '/*! wmf.js (C) 2020-present SheetJS LLC -- https://sheetjs.com */';

module.exports = {
	mode: 'development',
	entry: './misc/entry.js',
	devtool: 'source-map',
	output: {
		library: 'WMF',
		libraryTarget: 'commonjs2',
		filename: 'wmf.node.js'
	},
	target: 'node',
	externals: [nodeExternals()],
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
