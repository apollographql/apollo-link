import sourcemaps from 'rollup-plugin-sourcemaps';

export const globals = {
  // Apollo
  'apollo-client': 'apollo.core',
  'apollo-link': 'apolloLink.core',
  'apollo-link-batch': 'apolloLink.batch',
  'apollo-utilities': 'apollo.utilities',
  'zen-observable-ts': 'apolloLink.zenObservable',

  //GraphQL
  'graphql/language/printer': 'printer',
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
  plugins: [sourcemaps()],
});

export function onwarn(message) {
  const suppressed = ['UNRESOLVED_IMPORT', 'THIS_IS_UNDEFINED'];

  if (!suppressed.find(code => message.code === code)) {
    return console.warn(message.message);
  }
}
