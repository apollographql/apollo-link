import { assert } from 'chai';
import * as LinkUtils from '../src/linkUtils';
import {
  Observable,
} from '../src/types';

describe('Link utilities:', () => {
  describe('toSubscriber', () => {
    it('should return a subscriber containing next', () => {
      const subscriber = LinkUtils.toSubscriber(() => void 0);
      assert.property(subscriber, 'next');
      assert.property(subscriber, 'error');
      assert.property(subscriber, 'complete');
      assert.isDefined(subscriber.next);
      assert.isUndefined(subscriber.error);
      assert.isUndefined(subscriber.complete);
    });

    it('should return a subscriber containing next and error', () => {
      const subscriber = LinkUtils.toSubscriber(() => void 0, () => void 0);
      assert.property(subscriber, 'next');
      assert.property(subscriber, 'error');
      assert.property(subscriber, 'complete');
      assert.isDefined(subscriber.next);
      assert.isDefined(subscriber.error);
      assert.isUndefined(subscriber.complete);
    });

    it('should return a subscriber containing next, error, and complete', () => {
      const subscriber = LinkUtils.toSubscriber(() => void 0, () => void 0, () => void 0);
      assert.property(subscriber, 'next');
      assert.property(subscriber, 'error');
      assert.property(subscriber, 'complete');
      assert.isDefined(subscriber.next);
      assert.isDefined(subscriber.error);
      assert.isDefined(subscriber.complete);
    });

    it('should return same subscriber', () => {
      const subscriber = {
        next: () => void 0,
        error: () => void 0,
        complete: () => void 0,
      };
      assert.deepEqual(subscriber, LinkUtils.toSubscriber(subscriber));
    });

  });

  describe('validateOperation', () => {

  });

  describe('ensureNext', () => {
    it('should throw on when next undefined', () => {
      assert.throws(() => LinkUtils.ensureNext(undefined as any));
    });

    it('should throw on when next undefined', () => {
      assert.doesNotThrow(() => LinkUtils.ensureNext((operation) => <Observable>{}));
    });
  });

});
