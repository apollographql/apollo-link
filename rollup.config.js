export const globals = {
  // Apollo
  'apollo-link': 'apolloLink',
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

export const external = Object.keys(globals);

export default name => ({
  entry: './lib/index.js',
  dest: './lib/bundle.umd.js',
  format: 'umd',
  sourceMap: true,
  moduleName: name,
  exports: 'named',
  onwarn,
});

function onwarn(message) {
  const suppressed = ['UNRESOLVED_IMPORT', 'THIS_IS_UNDEFINED'];

  if (!suppressed.find(code => message.code === code)) {
    return console.warn(message.message);
  }
}
