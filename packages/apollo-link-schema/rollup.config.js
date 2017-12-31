import { onwarn } from '../../rollup.config';

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
