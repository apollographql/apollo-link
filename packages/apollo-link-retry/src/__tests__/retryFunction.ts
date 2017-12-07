import { buildRetryFunction, RetryFunction } from '../retryFunction';

describe('buildRetryFunction', () => {
  it('stops after hitting maxTries', () => {
    const retryFunction = buildRetryFunction({ max: 3 });

    expect(retryFunction(2, null, {})).toEqual(true);
    expect(retryFunction(3, null, {})).toEqual(false);
    expect(retryFunction(4, null, {})).toEqual(false);
  });

  it('skips retries if there was no error, by default', () => {
    const retryFunction = buildRetryFunction();

    expect(retryFunction(1, null, undefined)).toEqual(false);
    expect(retryFunction(1, null, {})).toEqual(true);
  });

  it('supports custom predicates, but only if max is not exceeded', () => {
    const stub = jest.fn(() => true);
    const retryFunction = buildRetryFunction({ max: 3, retryIf: stub });

    expect(retryFunction(2, null, null)).toEqual(true);
    expect(retryFunction(3, null, null)).toEqual(false);
  });
});
