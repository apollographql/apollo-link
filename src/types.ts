import { DocumentNode } from 'graphql/language/ast';

export interface ApolloFetcher {
  request (operation: Operation): Observable;
}

export interface PromiseFetcher {
  request (operation: Operation): Promise<FetchResult>;
}

export interface Operation {
  query?: DocumentNode;
  variables?: object;
  operationName?: string;
  context?: object;
}

export interface Observable {
    subscribe(subscriber: Subscriber<FetchResult>): UnsubscribeHandler;
    subscribe(
      next: (result: FetchResult) => void,
      error?: (error: any) => void,
      complete?: () => void,
    ): UnsubscribeHandler;
}

export interface Subscriber<T> {
  next: (result: T) => void;
  error?: (error: any) => void;
  complete?: () => void;
}

export interface FetchResult {
  data: any;
  errors?: any;
  extensions?: any;
  context?: object;
}

export type UnsubscribeHandler = () => void;
