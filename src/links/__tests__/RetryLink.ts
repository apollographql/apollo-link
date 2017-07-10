import * as gql from 'graphql-tag';
import HttpLink from '../HttpLink';
import RetryLink from '../RetryLink';

it('handles rejections correctly', complete => {
  let count = 1;
  // mock fetch response
  fetch.mockImplementationOnce(() => Promise.reject(new Error('offline')));

  fetch.mockResponseOnce(JSON.stringify({ data: { foo: { bar: true } } }));
  const request = HttpLink('/graphql')
    .concat(new RetryLink({ max: 2, delay: 10 }))
    .request({
      query: gql`
        {
          foo {
            bar
          }
        }
      `,
    });

  request.subscribe({
    next: data => {
      expect(data.data).toEqual({ foo: { bar: true } });
      expect(count).toEqual(1);
      complete();
    },
    error: e => {
      // this shouldn't run since retry is handling it for us
      count++;
    },
    complete,
  });
});
it('eventually reports errors if over the retry count', complete => {
  let count = 1;
  // first failure
  fetch.mockImplementationOnce(() => Promise.reject(new Error('offline')));

  // second failure
  fetch.mockImplementationOnce(() => Promise.reject(new Error('offline')));

  // no more retry, still report an error
  fetch.mockImplementationOnce(() => Promise.reject(new Error('offline')));

  // just in case to fail the test we create a success
  fetch.mockResponseOnce(JSON.stringify({ data: { foo: { bar: true } } }));

  const request = HttpLink('/graphql')
    .concat(new RetryLink({ max: 2, delay: 10 }))
    .request({
      query: gql`
        {
          foo {
            bar
          }
        }
      `,
    });

  request.subscribe({
    next: data => {
      count++;
    },
    error: e => {
      // this should run after the 2nd retry fails
      // this just ensures that `next` isn't called
      expect(count).toEqual(1);
      expect(e.message).toMatch(/offline/);
      complete();
    },
  });
});
it('eventually reports the final request after the retry count', complete => {
  let count = 1;
  // first failure
  fetch.mockImplementationOnce(() => Promise.reject(new Error('offline')));

  // second failure
  fetch.mockImplementationOnce(() => Promise.reject(new Error('offline')));

  // the last chance
  fetch.mockResponseOnce(JSON.stringify({ data: { foo: { bar: true } } }));

  const request = HttpLink('/graphql')
    .concat(new RetryLink({ max: 2, delay: 10 }))
    .request({
      query: gql`
        {
          foo {
            bar
          }
        }
      `,
    });

  request.subscribe({
    next: data => {
      count++;
      // this should run after the 2nd retry fails and the final
      // chance passes
      expect(count).toEqual(2);
      expect(data.data).toEqual({ foo: { bar: true } });
      complete();
    },
    error: e => {
      count++;
    },
  });
});
