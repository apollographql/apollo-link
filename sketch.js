import { ApolloLink, from, split, concat } from 'apollo-link';

/*
 * Problems to be solved
 *
 * 1. its really easy to mutate and override context on an operation
 * 2. its easy to oversend data (like the context) on a request
 * 3. mutatable context seems like a bad / scary idea especially if link.race becomes possible
 * 4. the current stateless vs stateful api feels weird when constructing chains
 *
 * Things a link could need
 * 1. operation: { query, variables, operationName } (i.e. props)
 * 2. the next link: (i.e forward) (i.e. the render return)
 * 3. information about the context (i.e. props | state)
 *
 * I think in an ideal world, the end link developer should only need to focus on their link and
 * not how they are composed together
 *
 */

/*
 * Possible solutions
 *
 * 1. make setting context a method on the class and merge within the library
 * 2. remove context as part of the operation, instead make it a part of the class
 * 3. orchestrate context updates via internal executing method
 * 4. remove stateless API or provide a way to write them with context management?
 *
 * In teaching this, what is the relationship between context and the operation itself?
 * - when can the operation be changed vs the context?
 * - what is the purpose of the context?
 * 
 *
 */

export class AuthLink extends ApolloLink {
  request(operation, forward) {
    this.setContext({
      headers: {
        ...this.context.headers,
        authorization: Meteor.userId(),
      },
    });

    return forward(operation);
  }
}

const auth = new ApolloLink((operation, forward) => {
  this.setContext({
    headers: {
      ...this.context.headers,
      authorization: Meteor.userId(),
    },
  });

  return forward(operation);
});

const http = ({ uri: string }) =>
  new ApolloLink(operation => {
    return new Observable(observer => {
      const headers = this.context.headers;
      fetch(uri, { body: JSON.stringify(operation) })
        .then(observer.next)
        .catch(observer.error);
    });
  });

const mutation = new ApolloLink(operation => {
  return new Observable(observer => {
    const { url } = this.context.mutation;
    const { variables } = operation;
    fetch(url, {
      body: {
        /* my payload for the mutation */
      },
    })
      .then(observer.next)
      .catch(observer.error);
  });
});

const link = from(auth).split(isMutation, mutation, http({ uri: '/graphql' }));
