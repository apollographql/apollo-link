import { execute, ApolloLink } from './link';
export { makePromise } from './linkUtils';
export * from './types';

import * as Observable from 'zen-observable';

export default ApolloLink;
export { Observable, ApolloLink, execute };
