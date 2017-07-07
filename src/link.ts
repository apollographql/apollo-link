import {
  ExternalOperation,
  ApolloChainLink,
  ApolloLink,
  NextLink,
  Operation,
} from './types';

import {
  parse,
} from 'graphql/language/parser';

export default class Link {
  public static chain(links: ApolloLink[]): ApolloChainLink {
    if ( links.length < 1 ) {
      throw new Error('Must have at least one link to form a chain');
    }

    const _links = [...links];
    return {
      request: (operation: ExternalOperation) => {
        const _operation = Link.transformOperation(operation);

        const chainStart = Link.buildLinkChain(_links);
        return chainStart(_operation);

      },
    };
  }

  public static asPromiseWrapper(link) {
    return {
      request: Link.toPromise(link),
    };
  }

  private static toPromise = (link) => {
    return (operation: Operation, next?: NextLink) => {
      const observable = link.request(operation, next);
      return new Promise((resolve, reject) => {
        observable.subscribe({
          next: resolve,
          error: reject,
        });
      });
    };
  }

  private static buildLinkChain(links: ApolloLink[]): NextLink {
    const _links = [...links];

    const forwards = _links.map((link, i) => operation => link.request(operation, forwards[i + 1]));

    return forwards[0];
  }

  private static transformOperation(operation) {
    if (operation.query && typeof operation.query === 'string') {
      return {
        ...operation,
        query: parse(operation.query),
      };
    }

    //TODO do some validation on operation?
    return operation;
  }
}
