import {
  ApolloLink,
} from './types';
import SingleRequestLink from './singleRequestLink';
import { createApolloFetch } from 'apollo-fetch';

export function createHttpLink(uri: string = '/graphql'): ApolloLink {
  const fetch = createApolloFetch({uri});
  const link = new SingleRequestLink({fetch});
  (link as any).use = (middlewares) => {
    fetch.use(middlewares);
    return link;
  };
  (link as any).useAfter = (afterwares) => {
    fetch.useAfter(afterwares);
    return link;
  };
  return link;
}
