import { ApolloLink } from './types';
import SingleRequestLink from './singleRequestLink';
import { ApolloFetch } from 'apollo-fetch';

export function createHttpLink(fetchParams?: {
  uri?: string,
  fetch?: ApolloFetch,
}): ApolloLink {
  const link = new SingleRequestLink(fetchParams);
  return link;
}

// HttpLink is an alias for SingleRequestLink
export default SingleRequestLink;
