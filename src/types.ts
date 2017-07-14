import { DocumentNode } from 'graphql/language/ast';
import * as Observable from 'zen-observable';

export interface GraphQLRequest {
  //This string could be an id for a persisted query
  query?: string | DocumentNode;
  variables?: object;
  context?: object;
}

export interface Link {
  request (operation: Operation, forward?: NextLink): Observable<FetchResult>;
}

export interface PromiseLink {
  request (operation: Operation): Promise<FetchResult>;
}

export interface Operation {
  query: DocumentNode;
  variables?: any;
  context?: any;
}

export interface Subscriber<T> {
  next?: (result: T) => void;
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

export type NextLink = (operation: Operation) => Observable<FetchResult>;
export type RequestHandler = (operation: Operation, forward?: NextLink) => Observable<FetchResult> | null;

export interface Chain {
  request(operation: Operation, forward: NextLink);
}
