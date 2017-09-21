import { getOperationName } from 'apollo-utilities';
import Observable from 'zen-observable-ts';

import { GraphQLRequest, Operation } from './types';
import { ApolloLink } from './link';

export function validateOperation(operation: GraphQLRequest): GraphQLRequest {
  const OPERATION_FIELDS = ['query', 'operationName', 'variables', 'context'];
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

export function makePromise<R>(observable: Observable<R>): Promise<R> {
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

export function transformOperation(operation: GraphQLRequest): Operation {
  const transformedOperation: Operation = { ...operation };

  // best guess at an operation name
  if (!transformedOperation.operationName) {
    transformedOperation.operationName =
      typeof transformedOperation.query !== 'string'
        ? getOperationName(transformedOperation.query)
        : '';
  }

  return transformedOperation as Operation;
}
