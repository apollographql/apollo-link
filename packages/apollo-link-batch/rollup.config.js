export default {
  entry: 'lib/batchLink.js',
  dest: 'lib/bundle.umd.js',
  format: 'umd',
  sourceMap: true,
  moduleName: 'batchLink',
  exports: 'named',
  onwarn,
};

function onwarn(message) {
  const suppressed = ['UNRESOLVED_IMPORT', 'THIS_IS_UNDEFINED'];

  if (!suppressed.find(code => message.code === code)) {
    return console.warn(message.message);
  }
}
