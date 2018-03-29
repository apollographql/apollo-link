import execute from 'rollup-plugin-execute';
import sourcemaps from 'rollup-plugin-sourcemaps';

export const globals = {
  // Apollo
  'apollo-client': 'apollo.core',
  'apollo-link': 'apolloLink.core',
  'apollo-link-batch': 'apolloLink.batch',
  'apollo-utilities': 'apollo.utilities',
  'apollo-link-http-common': 'apolloLink.httpCommon',
  'zen-observable-ts': 'apolloLink.zenObservable',

  //GraphQL
  'graphql/language/printer': 'printer',

  'zen-observable': 'Observable',
};

export default name => ({
  input: 'lib/index.js',
  output: {
    file: 'lib/bundle.umd.js',
    format: 'umd',
    name: `apolloLink.${name}`,
    globals,
    sourcemap: true,
    exports: 'named',
  },
  external: Object.keys(globals),
  onwarn,
  plugins: [
    sourcemaps(),
    // Embed the base tsconfig into the deployed bundle of every sub-package
    execute(`cp "../../tsconfig.json" ./lib/tsconfig.base.json; sed 's|../../tsconfig"|./tsconfig.base"|' < tsconfig.json > ./lib/tsconfig.json`),
  ]
});

export function onwarn(message) {
  const suppressed = ['UNRESOLVED_IMPORT', 'THIS_IS_UNDEFINED'];

  if (!suppressed.find(code => message.code === code)) {
    return console.warn(message.message);
  }
}
