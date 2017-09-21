import Observable from '../zenObservable';

describe('forEach ', () => {
  it('throws on not a function', () => {
    expect(Observable.from([1, 2, 3, 4]).forEach(<any>1).then).toThrow();
  });

  it('throws on not a function', () => {
    const error = new Error('completed');
    return new Observable<number>(observer => {
      observer.complete();
      throw error;
    })
      .forEach(x => x)
      .catch(err => expect(err).toEqual(error));
  });
});
