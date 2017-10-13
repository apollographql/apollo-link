import { execute, Observable } from 'apollo-link';
import gql from 'graphql-tag';

import { PollingLink } from '../pollingLink';

const query = gql`
  query SampleQuery {
    stub {
      id
    }
  }
`;

describe('PollingLink', () => {
  it('should construct with an interval', () => {
    expect(() => new PollingLink(() => null)).not.toThrow();
  });

  it('should construct with an interval', () => {
    expect(() => new PollingLink(() => 1)).not.toThrow();
  });

  it('should poll request', done => {
    let count = 0;
    let subscription;
    const spy = jest.fn();
    const checkResults = () => {
      const calls = spy.mock.calls;
      calls.map((call, i) => expect(call[0].data.count).toEqual(i));
      expect(calls.length).toEqual(5);
      done();
    };

    const poll = new PollingLink(() => 1).concat(() => {
      if (count >= 5) {
        subscription.unsubscribe();
        checkResults();
      }
      return Observable.of({
        data: {
          count: count++,
        },
      });
    });

    subscription = execute(poll, { query }).subscribe({
      next: spy,
      error: error => {
        throw error;
      },
      complete: () => {
        throw new Error();
      },
    });
  });

  it('should poll request until error', done => {
    let count = 0;
    let subscription;
    const error = new Error('End polling');

    const spy = jest.fn();
    const checkResults = actualError => {
      expect(error).toEqual(actualError);
      const calls = spy.mock.calls;
      calls.map((call, i) => expect(call[0].data.count).toEqual(i));
      expect(calls.length).toEqual(5);
      done();
    };

    const poll = new PollingLink(() => 1).concat(() => {
      if (count >= 5) {
        return new Observable(observer => {
          throw error;
        });
      }

      return Observable.of({
        data: {
          count: count++,
        },
      });
    });

    subscription = execute(poll, { query }).subscribe({
      next: spy,
      error: err => checkResults(err),
      complete: () => {
        throw new Error();
      },
    });
  });
});
