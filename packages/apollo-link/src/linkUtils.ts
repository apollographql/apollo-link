import { getOperationName } from 'apollo-utilities';
import * as Observable from 'zen-observable';
import { print } from 'graphql/language/printer';

import { GraphQLRequest, Operation } from './types';
import { ApolloLink } from './link';

export function validateOperation(operation: GraphQLRequest): GraphQLRequest {
  const OPERATION_FIELDS = [
    'query',
    'operationName',
    'variables',
    'extensions',
    'context',
  ];
  if (!operation.query) throw new Error('ApolloLink requires a query');
  for (let key of Object.keys(operation)) {
    if (OPERATION_FIELDS.indexOf(key) < 0) {
      throw new Error(`illegal argument: ${key}`);
    }
  }

  return operation;
}

export class LinkError extends Error {
  public link: ApolloLink;
  constructor(message?: string, link?: ApolloLink) {
    super(message);
    this.link = link;
  }
}

export function isTerminating(link: ApolloLink): boolean {
  return link.request.length <= 1;
}

export function toPromise<R>(observable: Observable<R>): Promise<R> {
  let completed = false;
  return new Promise<R>((resolve, reject) => {
    observable.subscribe({
      next: data => {
        if (completed) {
          console.warn(
            `Promise Wrapper does not support multiple results from Observable`,
          );
        } else {
          completed = true;
          resolve(data);
        }
      },
      error: reject,
    });
  });
}

// backwards compat
export const makePromise = toPromise;

export function fromPromise<T>(promise: Promise<T>): Observable<T> {
  return new Observable<T>(observer => {
    promise
      .then((value: T) => {
        observer.next(value);
        observer.complete();
      })
      .catch(observer.error.bind(observer));
  });
}

export function transformOperation(operation: GraphQLRequest): GraphQLRequest {
  const transformedOperation: GraphQLRequest = {
    variables: operation.variables || {},
    extensions: operation.extensions || {},
    operationName: operation.operationName,
    query: operation.query,
  };

  // best guess at an operation name
  if (!transformedOperation.operationName) {
    transformedOperation.operationName =
      typeof transformedOperation.query !== 'string'
        ? getOperationName(transformedOperation.query)
        : '';
  }

  return transformedOperation as Operation;
}

export function createOperation(
  starting: any,
  operation: GraphQLRequest,
): Operation {
  let context = { ...starting };
  const setContext = next => {
    if (typeof next === 'function') {
      context = next(context);
    } else {
      context = { ...next };
    }
  };
  const getContext = () => ({ ...context });

  Object.defineProperty(operation, 'setContext', {
    enumerable: false,
    value: setContext,
  });

  Object.defineProperty(operation, 'getContext', {
    enumerable: false,
    value: getContext,
  });

  Object.defineProperty(operation, 'toKey', {
    enumerable: false,
    value: () => getKey(operation),
  });

  return operation as Operation;
}

export function getKey(operation: GraphQLRequest) {
  // XXX we're assuming here that variables will be serialized in the same order.
  // that might not always be true
  return `${print(operation.query)}|${JSON.stringify(
    operation.variables,
  )}|${operation.operationName}`;
}
