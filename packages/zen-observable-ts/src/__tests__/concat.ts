import Observable from '../zenObservable';

describe('concat', () => {
  it('concatenates the supplied Observable arguments', async () => {
    let list = [];

    await Observable.from([1, 2, 3, 4])
      .concat(Observable.of(5, 6, 7))
      .forEach(x => list.push(x));

    expect(list).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
