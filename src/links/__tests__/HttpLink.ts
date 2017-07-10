import * as gql from 'graphql-tag';
import HttpLink from '../HttpLink';

it('can make a single query', complete => {
  // mock fetch response
  fetch.mockResponseOnce(JSON.stringify({ data: { foo: { bar: true } } }));

  const request = HttpLink('/graphql').request({
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
      if (!data || !data.data) throw new Error('missing data');
      expect(data.data).toEqual({ foo: { bar: true } });
    },
    error: e => console.error(e),
    complete,
  });
});
it('preserves context', complete => {
  // mock fetch response
  fetch.mockResponseOnce(JSON.stringify({ data: { foo: { bar: true } } }));

  const request = HttpLink('/graphql').request({
    query: gql`
      {
        foo {
          bar
        }
      }
    `,
    context: {
      hello: 'world',
    },
  });

  request.subscribe({
    next: data => {
      if (!data || !data.data) throw new Error('missing data');
      expect(data.data).toEqual({ foo: { bar: true } });
      expect(data.context).toEqual({ hello: 'world' });
    },
    error: e => console.error(e),
    complete,
  });
});

it('handles rejections correctly', complete => {
  // mock fetch response
  fetch.mockImplementationOnce(() => Promise.reject(new Error('offline')));

  const request = HttpLink('/graphql').request({
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
      console.log(data);
      expect(data).toBeUndefined();
    },
    error: e => {
      expect(e.message).toMatch(/offline/);
      complete();
    },
    complete,
  });
});
