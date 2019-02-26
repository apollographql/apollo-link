import sourcemaps from 'rollup-plugin-sourcemaps';
import node from 'rollup-plugin-node-resolve';
import typescript from 'typescript';
import typescriptPlugin from 'rollup-plugin-typescript2';
import { terser as minify } from 'rollup-plugin-terser';

export const globals = {
  // Apollo
  'apollo-client': 'apollo.core',
  'apollo-link': 'apolloLink.core',
  'apollo-link-batch': 'apolloLink.batch',
  'apollo-link-http-common': 'apolloLink.httpCommon',
  'zen-observable-ts': 'apolloLink.zenObservable',
  'subscriptions-transport-ws': 'subscriptions-transport-ws',

  //GraphQL
  'graphql/language/printer': 'printer',

  // TypeScript
  'tslib': 'tslib',

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
      sourcemaps()
    ],
  },
  {
    input: 'lib/bundle.esm.js',
    output: {
      file: 'lib/bundle.min.js',
      format: 'cjs',
      globals,
    },
    external: Object.keys(globals),
    onwarn,
    plugins: [
      minify({
        mangle: {
          toplevel: true,
        },
        compress: {
          dead_code: true,
          global_defs: {
            "@process.env.NODE_ENV": JSON.stringify("production"),
          },
        },
      }),
    ],
  }
];

export function onwarn(message) {
  const suppressed = ['UNRESOLVED_IMPORT', 'THIS_IS_UNDEFINED'];

  if (!suppressed.find(code => message.code === code)) {
    return console.warn(message.message);
  }
}
