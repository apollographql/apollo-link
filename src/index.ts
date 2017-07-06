import * as ApolloLink from './types';
import SingleRequestLink from './singleRequestLink';
import { createHttpLink } from './httpLink';
import BatchHttpLink from './batch/batchHttpLink';

import Link from './link';

export {
  Link,

  SingleRequestLink,
  createHttpLink,

  BatchHttpLink,
};
export default ApolloLink;
