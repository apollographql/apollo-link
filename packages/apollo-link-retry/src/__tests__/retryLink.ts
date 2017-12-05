import gql from 'graphql-tag';
import { execute, ApolloLink, Observable, FetchResult } from 'apollo-link';

import { RetryLink } from '../retryLink';

const query = gql`
  {
    sample {
      id
    }
  }
`;

const error = new Error('I never work');

describe('RetryLink', () => {
  it('fails for unreachable endpoints', done => {
    const max = 10;
    const retry = new RetryLink({ delay: 1, max });
    const stub = jest.fn(() => {
      return new Observable(observer => observer.error(error));
    });
    const link = ApolloLink.from([retry, stub]);

    execute(link, { query }).subscribe(
      () => {
        throw new Error();
      },
      actualError => {
        expect(stub).toHaveBeenCalledTimes(max);
        expect(error).toEqual(actualError);
        done();
      },
      () => {
        throw new Error();
      },
    );
  });

  it('returns data from the underlying link on a successful operation', done => {
    const retry = new RetryLink();
    const data = <FetchResult>{
      data: {
        hello: 'world',
      },
    };
    const stub = jest.fn();
    stub.mockReturnValue(Observable.of(data));
    const link = ApolloLink.from([retry, stub]);

    execute(link, { query }).subscribe(
      actualData => {
        expect(stub).toHaveBeenCalledTimes(1);
        expect(data).toEqual(actualData);
      },
      () => {
        throw new Error();
      },
      done,
    );
  });

  it('returns data from the underlying link on a successful retry', done => {
    const retry = new RetryLink({ delay: 1, max: 2 });
    const data = <FetchResult>{
      data: {
        hello: 'world',
      },
    };
    const stub = jest.fn();
    stub.mockReturnValueOnce(new Observable(observer => observer.error(error)));
    stub.mockReturnValueOnce(Observable.of(data));

    const link = ApolloLink.from([retry, stub]);

    execute(link, { query }).subscribe(
      actualData => {
        expect(stub).toHaveBeenCalledTimes(2);
        expect(data).toEqual(actualData);
      },
      () => {
        throw new Error();
      },
      done,
    );
  });
});
