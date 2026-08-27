const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');
// @ts-check
/**
 * @type{(...args)=>import("webpack").Configuration}
 */
module.exports = {
    // Lowest handler declared in task.json, so the bundle runs on both Node20_1 and Node24 agents.
    target: "node20",
    mode: "production",
    entry: ["./src"],
    // Keep the real __dirname so azure-pipelines-task-lib finds lib.json next to the bundle.
    node: {
        __dirname: false,
        __filename: false,
    },
    resolve: {
        extensions: [".ts", ".js"],
        modules: ["src", "node_modules"],
        symlinks: false,
    },
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin({ extractComments: false })],
    },
    output: {
        filename: "index.js",
        libraryTarget: "commonjs"
    },
    module: {
        rules: [
            { test: /\.ts$/i, loader: "ts-loader", options: { allowTsInNodeModules: true } },
            {
                test: /azure-pipelines-task-lib[\\/]internal\.js$/,
                loader: path.resolve(__dirname, "build/tasklib-resource-require-loader.js")
            },
        ]
    },
    plugins: [
        new CopyPlugin({
          patterns: [
            { from: 'src/task.json', to: '[name][ext]'},
            { from: 'node_modules/azure-pipelines-task-lib/lib.json', to: '[name][ext]'},
            { from: 'images/fire.png', to: './icon.png', toType: 'file' }
          ],
        }),
      ]
}
