/* tslint:disable */

import {
  ApolloLink,
  Observable,
  Operation,
  NextLink,
  FetchResult,
} from 'apollo-link';
import { GraphQLError, ExecutionResult } from 'graphql';
import { ServerError, ServerParseError } from 'apollo-link-http-common';

export interface ErrorResponse {
  graphQLErrors?: ReadonlyArray<GraphQLError>;
  networkError?: Error | ServerError | ServerParseError;
  response?: ExecutionResult;
  operation: Operation;
  forward: NextLink;
}

export namespace ErrorLink {
  /**
   * Callback to be triggered when an error occurs within the link stack.
   */
  export interface ErrorHandler {
    (error: ErrorResponse): Observable<FetchResult> | void | Promise<void>;
  }
}

// For backwards compatibility.
export import ErrorHandler = ErrorLink.ErrorHandler;

export function onError(errorHandler: ErrorHandler): ApolloLink {
  return new ApolloLink((operation, forward) => {
    return new Observable(observer => {
      let sub;
      let retriedSub;
      let retriedResult;
      let handling = false;
      let completed = false;

      try {
        sub = forward(operation).subscribe({
          next: async result => {
            if (result.errors) {
              handling = true;
              retriedResult = await Promise.resolve<Observable<
                FetchResult
              > | void>(
                errorHandler({
                  graphQLErrors: result.errors,
                  response: result,
                  operation,
                  forward,
                }),
              );
              handling = false;

              if (retriedResult) {
                retriedSub = retriedResult.subscribe({
                  next: observer.next.bind(observer),
                  error: observer.error.bind(observer),
                  complete: observer.complete.bind(observer),
                });
                return;
              }
            }
            observer.next(result);
            if (completed) {
              observer.complete();
            }
          },
          error: async networkError => {
            handling = true;
            retriedResult = await Promise.resolve<Observable<
              FetchResult
            > | void>(
              errorHandler({
                operation,
                networkError,
                //Network errors can return GraphQL errors on for example a 403
                graphQLErrors:
                  networkError &&
                  networkError.result &&
                  networkError.result.errors,
                forward,
              }),
            );
            handling = false;
            if (retriedResult) {
              retriedSub = retriedResult.subscribe({
                next: observer.next.bind(observer),
                error: observer.error.bind(observer),
                complete: observer.complete.bind(observer),
              });
              return;
            }
            observer.error(networkError);
            if (completed) {
              observer.complete();
            }
          },
          complete: () => {
            completed = true;
            // disable the previous sub from calling complete on observable
            // if retry is in flight.
            if (!handling && !retriedResult) {
              observer.complete.bind(observer)();
            }
          },
        });
      } catch (e) {
        Promise.resolve<Observable<FetchResult> | void>(
          errorHandler({ networkError: e, operation, forward }),
        ).finally(() => {
          observer.error(e);
        });
        // observer.error(e);
      }

      return () => {
        if (sub) sub.unsubscribe();
        if (retriedSub) sub.unsubscribe();
      };
    });
  });
}

export class ErrorLink extends ApolloLink {
  private link: ApolloLink;
  constructor(errorHandler: ErrorLink.ErrorHandler) {
    super();
    this.link = onError(errorHandler);
  }

  public request(
    operation: Operation,
    forward: NextLink,
  ): Observable<FetchResult> | null {
    return this.link.request(operation, forward);
  }
}
