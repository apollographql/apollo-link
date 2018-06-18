import sourcemaps from "rollup-plugin-sourcemaps";

export const globals = {
  // Apollo
  "apollo-client": "apollo.core",
  "apollo-link": "apolloLink.core",
  "apollo-link-batch": "apolloLink.batch",
  "apollo-link-http-common": "apolloLink.httpCommon",
  "apollo-utilities": "apollo.utilities",
  // RxJS
  rxjs: "rxjs",
  "rxjs/operators": "rxjs.operators",
  //GraphQL
  "graphql/language/printer": "printer"
};

export default name => ({
  input: "lib/index.js",
  output: {
    file: "lib/bundle.umd.js",
    format: "umd",
    name: `apolloLink.${name}`,
    globals,
    sourcemap: true,
    exports: "named"
  },
  external: Object.keys(globals),
  onwarn,
  plugins: [sourcemaps()]
});

export function onwarn(message) {
  const suppressed = ["UNRESOLVED_IMPORT", "THIS_IS_UNDEFINED"];

  if (!suppressed.find(code => message.code === code)) {
    return console.warn(message.message);
  }
}
