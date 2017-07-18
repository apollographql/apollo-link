import { DocumentNode } from 'graphql/language/ast';
import * as Observable from 'zen-observable';

export interface GraphQLRequest {
  query?: string | DocumentNode;
  variables?: object;
  context?: object;
}

export interface Operation {
  query: DocumentNode;
  variables?: Record<string, any>;
  operationName?: string;
  context?: Record<string, any>;
}

export interface FetchResult {
  data: any;
  errors?: any;
  extensions?: any;
  context?: Record<string, any>;
}

export type NextLink = (operation: Operation) => Observable<FetchResult>;
export type RequestHandler = (operation: Operation, forward?: NextLink) => Observable<FetchResult> | null;
