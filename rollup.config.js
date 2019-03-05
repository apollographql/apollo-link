import sourcemaps from 'rollup-plugin-sourcemaps';
import node from 'rollup-plugin-node-resolve';
import typescript from 'typescript';
import typescriptPlugin from 'rollup-plugin-typescript2';
import invariantPlugin from 'rollup-plugin-invariant';

export const globals = {
  // Apollo
  'apollo-client': 'apollo.core',
  'apollo-link': 'apolloLink.core',
  'apollo-link-batch': 'apolloLink.batch',
  'apollo-link-http-common': 'apolloLink.httpCommon',
  'apollo-utilities': 'apolloUtilities',
  'zen-observable-ts': 'apolloLink.zenObservable',
  'subscriptions-transport-ws': 'subscriptions-transport-ws',

  // GraphQL
  'graphql/language/printer': 'graphql.printer',
  'graphql/execution/execute': 'graphql.execute',

  // TypeScript
  'tslib': 'tslib',

  // Other
  'ts-invariant': 'invariant',
  'zen-observable': 'Observable',
};

export default name => [
  {
    input: 'src/index.ts',
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
      node({ module: true }),
      typescriptPlugin({
        typescript,
        tsconfig: './tsconfig.json',
        tsconfigOverride: {
          compilerOptions: {
            module: "es2015",
          },
        },
      }),
      invariantPlugin({
        errorCodes: true,
      }),
      sourcemaps()
    ],
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'lib/bundle.esm.js',
      format: 'esm',
      globals,
      sourcemap: true,
    },
    external: Object.keys(globals),
    onwarn,
    plugins: [
      node({ module: true }),
      typescriptPlugin({
        typescript,
        tsconfig: './tsconfig.json',
        tsconfigOverride: {
          compilerOptions: {
            module: "es2015",
          },
        },
      }),
      invariantPlugin({
        errorCodes: true,
      }),
      sourcemaps()
    ],
  },
  {
    input: 'lib/bundle.esm.js',
    output: {
      file: 'lib/bundle.cjs.js',
      format: 'cjs',
      globals,
      sourcemap: true,
    },
    external: Object.keys(globals),
    onwarn,
  }
];

export function onwarn(message) {
  const suppressed = ['UNRESOLVED_IMPORT', 'THIS_IS_UNDEFINED'];

  if (!suppressed.find(code => message.code === code)) {
    return console.warn(message.message);
  }
}
