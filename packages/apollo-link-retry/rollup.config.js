import { globals, external } from '../../rollup.config';

export default {
  entry: 'lib/retryLink.js',
  dest: 'lib/bundle.umd.js',
  format: 'umd',
  sourceMap: true,
  moduleName: 'retryLink',
  exports: 'named',
  onwarn,
  globals,
  external,
};

function onwarn(message) {
  const suppressed = ['UNRESOLVED_IMPORT', 'THIS_IS_UNDEFINED'];

  if (!suppressed.find(code => message.code === code)) {
    return console.warn(message.message);
  }
}
