import {
  GraphQLRequest,
  NextLink,
  Subscriber,
} from './types';

function isSubscriber<T>(object: any): object is Subscriber<T> {
  return typeof object !== 'function';
}

export function toSubscriber<T>(
  nextOrSubscriber: Subscriber<T> | ((result: T) => void),
  error?: (error: any) => void,
  complete?: () => void): Subscriber<T> {

  if (isSubscriber(nextOrSubscriber)) {
    return <Subscriber<T>>nextOrSubscriber;
  } else {
    return {
      next: nextOrSubscriber,
      error,
      complete,
    };
  }
}

export function validateOperation(operation: GraphQLRequest): void {
  const OPERATION_FIELDS = ['query', 'operationName', 'variables', 'context'];
  for (let key of Object.keys(operation)) {
    if (OPERATION_FIELDS.indexOf(key) < 0) {
      throw new Error(`illegal argument: ${key}`);
    }
  }
}

export function ensureForward(forward?: NextLink): void {
  if (!forward || typeof forward !== 'function') {
      throw new Error(`next link should be present`);
  }
}

