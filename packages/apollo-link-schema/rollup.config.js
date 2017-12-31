export default {
  input: 'lib/schemaLink.js',
  output: {
    file: 'lib/bundle.umd.js',
    format: 'umd',
    sourcemap: true,
    name: 'schemaLink',
    exports: 'named',
  },
  onwarn,
};

function onwarn(message) {
  const suppressed = ['UNRESOLVED_IMPORT', 'THIS_IS_UNDEFINED'];

  if (!suppressed.find(code => message.code === code)) {
    return console.warn(message.message);
  }
}
