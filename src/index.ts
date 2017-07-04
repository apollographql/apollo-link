import * as ApolloLink from './types';
import SingleRequestLink from './singleRequestLink';
import { createHttpLink } from './httpLink';
import BatchHttpLink from './batch/batchHttpLink';

import {
  linkPromiseWrapper,
  linkToNetworkInterface,
}  from './link-as-promise';

export {
  linkPromiseWrapper,
  linkToNetworkInterface,

  SingleRequestLink,
  createHttpLink,

  BatchHttpLink,
};
export default ApolloLink;
