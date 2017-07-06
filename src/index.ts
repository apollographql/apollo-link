import { execute, ApolloLink } from './link';

import * as Observable from 'zen-observable';

export {
  ApolloLink,
  execute,

  Observable,

  //Transport Links
  HttpLink,

  //Functional Intermediates
  RetryLink,
  PollingLink,

};

export default ApolloLink;

