const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
// @ts-check
/**
 * @type{(...args)=>import("webpack").Configuration}
 */
module.exports = {
    target: "node",
    mode: "production",
    entry: ["./src"],
    resolve: {
        extensions: [".ts", ".js"],
        modules: ["src", "node_modules"],
        symlinks: false,
    },
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin()],
    },
    output: {
        filename: "index.js",
        libraryTarget: "commonjs"
    },
    module: {
        rules: [
            { test: /\.ts$/i, loader: "ts-loader", options: { allowTsInNodeModules: true } },
        ]
    },
    plugins: [
        new CopyPlugin({
          patterns: [
            { from: 'src/task.json', to: '.', flatten: true},
            { from: 'images/fire.png', to: '.', flatten: true }
          ],
        }),
      ]
}
