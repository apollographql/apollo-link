import {
  ExternalOperation,
  ApolloChainLink,
  ApolloLink,
  NextLink,
  Operation,
} from './types';

import {
  validateOperation,
} from './linkUtils';

import {
  parse,
} from 'graphql/language/parser';

export function chain(links: ApolloLink[]): ApolloChainLink {
  if (links.length < 1) {
    throw new Error('Must have at least one link to form a chain');
  }

  const _links = [...links];
  return {
    request: (operation: ExternalOperation) => {
      validateOperation(operation);
      const _operation = transformOperation(operation);

      const chainStart = buildLinkChain(_links);
      return chainStart(_operation);

    },
  };
}

const toPromise = (link) => {
  return (operation: Operation, forward?: NextLink) => {
    const observable = link.request(operation, forward);

    return new Promise((resolve, reject) => {
      observable.subscribe({
        next: resolve,
        error: reject,
      });
    });
  };
};

export function asPromiseWrapper(link) {
  return {
    request: toPromise(link),
  };
}

function buildLinkChain(links: ApolloLink[]): NextLink {
  const _links = [...links];

  const forwards = _links.map((link, i) => {
    return operation => {
      return link.request(operation, forwards[i + 1]);
    };
  });

  return forwards[0];
}

function transformOperation(operation) {
  if (operation.query && typeof operation.query === 'string') {
    return {
      ...operation,
      query: parse(operation.query),
    };
  }

  //TODO do some validation on operation?
  return operation;
}
