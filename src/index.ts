import * as ApolloLink from './types';
import SingleRequestLink from './singleRequestLink';
import HttpLink, { createHttpLink } from './httpLink';
import RetryLink from './retryLink';

import * as Link from './link';

export {
  Link,

  //Transport Links
  SingleRequestLink,
  createHttpLink,
  HttpLink,

  //Functional Intermediates
  RetryLink,

};
export default ApolloLink;
