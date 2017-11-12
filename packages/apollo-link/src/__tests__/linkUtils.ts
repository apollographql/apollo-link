import { validateOperation } from '../linkUtils';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';

describe('Link utilities:', () => {
  describe('validateOperation', () => {
    it('should throw when invalid field in operation', () => {
      expect(() => validateOperation(<any>{ qwerty: '' })).toThrow();
    });

    it('should throw when missing a query of some kind', () => {
      expect(() =>
        validateOperation(<any>{
          query: '',
        }),
      ).toThrow();
    });

    it('should not throw when valid fields in operation', () => {
      expect(() =>
        validateOperation({
          query: '1234',
          context: {},
          variables: {},
        }),
      ).not.toThrow();
    });
  });
});
