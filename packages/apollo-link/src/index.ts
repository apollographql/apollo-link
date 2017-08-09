import ApolloLink from 'apollo-link-core';

import BatchLink from 'apollo-link-batch';
import BatchHttpLink from 'apollo-link-batch-http';
import DedupLink from 'apollo-link-dedup';
import HttpLink from 'apollo-link-http';
import RetryLink from 'apollo-link-retry';
import SetContextLink from 'apollo-link-set-context';
import PollingLink from 'apollo-link-polling';
import WebSocketLink from 'apollo-link-ws';

export * from 'apollo-link-core';

export {
  BatchLink,
  BatchHttpLink,
  HttpLink,
  RetryLink,
  SetContextLink,
  PollingLink,
  WebSocketLink,
  DedupLink,
};

export default ApolloLink;
