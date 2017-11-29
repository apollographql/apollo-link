import { Observable, ApolloLink, execute } from 'apollo-link';
import { print, graphql } from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
import gql from 'graphql-tag';

import { SchemaLink } from '../schemaLink';

const sampleQuery = gql`
  query SampleQuery {
    stub {
      id
    }
  }
`;

const sampleMutation = gql`
  mutation SampleMutation {
    stub(param: "value") {
      id
    }
  }
`;

const typeDefs = `
type Stub {
  id: String
}

type Query {
  sampleQuery: Stub
}
`;

const schema = makeExecutableSchema({ typeDefs });

describe('SchemaLink', () => {
  const data = { data: { hello: 'world' } };
  const data2 = { data: { hello: 'everyone' } };
  const mockError = { throws: new TypeError('mock me') };

  let subscriber;

  beforeEach(() => {
    const next = jest.fn();
    const error = jest.fn();
    const complete = jest.fn();

    subscriber = {
      next,
      error,
      complete,
    };
  });

  it('raises warning if called with concat', () => {
    const link = new SchemaLink({ schema });
    const _warn = console.warn;
    console.warn = warning => expect(warning['message']).toBeDefined();
    expect(link.concat((operation, forward) => forward(operation))).toEqual(
      link,
    );
    console.warn = _warn;
  });

  it('throws if no arguments given', () => {
    expect(() => new SchemaLink()).toThrow();
  });

  it('correctly receives the constructor arguments', () => {
    let rootValue = {};
    let context = {};
    let link = new SchemaLink({ schema, rootValue, context });
    expect(link.rootValue).toEqual(rootValue);
    expect(link.context).toEqual(context);
    expect(link.schema).toEqual(schema);
  });

  it('calls next and then complete', done => {
    const next = jest.fn();
    const link = new SchemaLink({ schema });
    const observable = execute(link, {
      query: sampleQuery,
    });
    observable.subscribe({
      next,
      error: error => expect(false),
      complete: () => {
        expect(next).toHaveBeenCalledTimes(1);
        done();
      },
    });
  });

  it('calls error when fetch fails', done => {
    const badTypeDefs = 'type Query {}';
    const badSchema = makeExecutableSchema({ typeDefs });

    const link = new SchemaLink({ schema: badSchema });
    const observable = execute(link, {
      query: sampleQuery,
    });
    observable.subscribe(
      result => expect(false),
      error => {
        expect(error).toEqual(mockError.throws);
        done();
      },
      () => {
        expect(false);
        done();
      },
    );
  });

});
