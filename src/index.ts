import * as ApolloLink from './types';
import SingleRequestLink from './singleRequestLink';
import HttpLink, { createHttpLink } from './httpLink';
import BatchHttpLink from './batch/batchHttpLink';
import RetryLink from './retryLink';

import Link from './link';

export {
  Link,

  //Transport Links
  SingleRequestLink,
  createHttpLink,
  HttpLink,

  BatchHttpLink,

  //Functional Intermediates
  RetryLink,

};
export default ApolloLink;
