// azure-pipelines-task-lib loads its resource json with a dynamic require. Webpack turns that
// into a context lookup, which fails at runtime for lib.json/task.json copied next to the bundle.
module.exports = function (source) {
    return source.replace(/\brequire\(resourceFile\)/g, '__non_webpack_require__(resourceFile)');
};
