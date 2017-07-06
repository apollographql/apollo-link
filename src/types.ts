import { DocumentNode } from 'graphql/language/ast';

export interface ApolloChainLink {
  request (operation: ExternalOperation): Observable;
}

export interface ExternalOperation {
  query?: string | DocumentNode;
  variables?: object;
  operationName?: string;
  context?: object;
}

export interface ApolloLink {
  request (operation: Operation, next?: NextLink): Observable;
}

export interface PromiseLink {
  request (operation: Operation): Promise<FetchResult>;
}

export interface Operation {
  query?: DocumentNode;
  variables?: object;
  operationName?: string;
  context?: object;
}

export interface Observable {
    subscribe(subscriber: Subscriber<FetchResult>): Subscription;
    subscribe(
      next: (result: FetchResult) => void,
      error?: (error: any) => void,
      complete?: () => void,
    ): Subscription;
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

export interface Subscription {
  unsubscribe: () => void;
  closed: boolean;
}

export type NextLink = (operation: Operation) => Observable;
export type RequestHandler = (operation: Operation, next?: NextLink) => Observable;
