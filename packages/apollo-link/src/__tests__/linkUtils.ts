import * as LinkUtils from '../linkUtils';
import Observable from 'zen-observable-ts';

describe('Link utilities:', () => {
  describe('validateOperation', () => {
    it('should throw when invalid field in operation', () => {
      expect(() =>
        LinkUtils.validateOperation(<any>{
          qwerty: '',
        }),
      ).toThrow();
    });

    it('should throw when missing a query of some kind', () => {
      expect(() =>
        LinkUtils.validateOperation(<any>{
          query: '',
        }),
      ).toThrow();
    });

    it('should not throw when valid fields in operation', () => {
      expect(() =>
        LinkUtils.validateOperation({
          query: '1234',
          context: {},
          variables: {},
        }),
      ).not.toThrow();
    });
  });

  describe('makePromise', () => {
    const data = {
      data: {
        hello: 'world',
      },
    };
    const error = new Error('I always error');

    it('return next call as Promise resolution', () => {
      return LinkUtils.makePromise(Observable.of(data)).then(result =>
        expect(data).toEqual(result),
      );
    });

    it('return error call as Promise rejection', () => {
      return LinkUtils.makePromise(
        new Observable(observer => observer.error(error)),
      )
        .then(expect.fail)
        .catch(actualError => expect(error).toEqual(actualError));
    });

    describe('warnings', () => {
      const spy = jest.fn();
      let _warn: (message?: any, ...originalParams: any[]) => void;

      beforeEach(() => {
        _warn = console.warn;
        console.warn = spy;
      });

      afterEach(() => {
        console.warn = _warn;
      });

      it('return error call as Promise rejection', done => {
        LinkUtils.makePromise(Observable.of(data, data)).then(result => {
          expect(data).toEqual(result);
          expect(spy).toHaveBeenCalled();
          done();
        });
      });
    });
  });
});
