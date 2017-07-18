import { assert } from 'chai';
import * as LinkUtils from '../src/linkUtils';

describe('Link utilities:', () => {
  describe('validateOperation', () => {

    it('should throw when invalid field in operation', () => {
      assert.throws(() => LinkUtils.validateOperation(<any>{
        qwerty: '',
      }));
    });

    it('should not throw when valid fields in operation', () => {
      assert.doesNotThrow(() => LinkUtils.validateOperation({
        query: '',
        context: {},
        variables: {},
      }));
    });

  });
});
