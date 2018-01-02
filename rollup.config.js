export const globals = {
  // Apollo
  'apollo-client': 'apollo.core',
  'apollo-link': 'apolloLink.core',
  'apollo-link-batch': 'apolloLink.batch',
  'apollo-utilities': 'apollo.utilities',
  // RxJS
  'rxjs/Observable': 'Rx',
  // rxjs/observable
  'rxjs/observable/of': 'Rx.Observable',
  'rxjs/observable/empty': 'Rx.Observable',
  'rxjs/observable/interval': 'Rx.Observable',
  // rxjs/operator
  'rxjs/operator/toPromise': 'Rx.Observable',
  // rxjs/operators
  'rxjs/operators': 'Rx.Observable.prototype',
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
});

export function onwarn(message) {
  const suppressed = ['UNRESOLVED_IMPORT', 'THIS_IS_UNDEFINED'];

  if (!suppressed.find(code => message.code === code)) {
    return console.warn(message.message);
  }
}
