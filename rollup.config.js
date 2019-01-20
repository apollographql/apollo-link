import sourcemaps from 'rollup-plugin-sourcemaps';
import node from 'rollup-plugin-node-resolve';

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

export default name => [
  {
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
      node({
        module: true,
        only: ['tslib']
      }),
      sourcemaps()
    ],
  }, {
    input: 'lib/index.js',
    output: {
      file: 'lib/bundle.cjs.js',
      format: 'cjs',
      globals,
      sourcemap: true,
    },
    external: Object.keys(globals),
    onwarn,
    plugins: [
      node({
        module: true,
        only: ['tslib']
      }),
      sourcemaps()
    ],
  }, {
    input: 'lib/index.js',
    output: {
      file: 'lib/bundle.esm.js',
      format: 'esm',
      globals,
      sourcemap: true,
    },
    external: Object.keys(globals),
    onwarn,
    plugins: [
      node({
        module: true,
        only: ['tslib']
      }),
      sourcemaps()
    ],
  }
];

export function onwarn(message) {
  const suppressed = ['UNRESOLVED_IMPORT', 'THIS_IS_UNDEFINED'];

  if (!suppressed.find(code => message.code === code)) {
    return console.warn(message.message);
  }
}
