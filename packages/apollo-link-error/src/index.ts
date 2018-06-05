import {
  ApolloLink,
  Observable,
  Operation,
  NextLink,
  FetchResult,
} from 'apollo-link';
import { GraphQLError, ExecutionResult } from 'graphql';

export interface ErrorResponse {
  graphQLErrors?: GraphQLError[];
  networkError?: Error;
  response?: ExecutionResult;
  operation: Operation;
  forward: NextLink;
}

export namespace ErrorLink {
  /**
   * Callback to be triggered when an error occurs within the link stack.
   */
  export interface ErrorHandler {
    (error: ErrorResponse): Observable<FetchResult> | void;
  }
}

// For backwards compatibility.
export import ErrorHandler = ErrorLink.ErrorHandler;

export const onError = (errorHandler: ErrorHandler): ApolloLink => {
  return new ApolloLink((operation, forward) => {
    return new Observable(observer => {
      let sub;
      let retrySub;
      let retrying = false;

      try {
        sub = forward(operation).subscribe({
          next: result => {
            if (result.errors) {
              const retryForward = errorHandler({
                graphQLErrors: result.errors,
                response: result,
                operation,
                forward,
              });

              if (retryForward) {
                retrying = true;
                retrySub = retryForward.subscribe({
                  next: result => observer.next(result),
                  error: networkError => observer.error(networkError),
                  complete: observer.complete.bind(observer),
                });
                return;
              }
            }
            observer.next(result);
          },
          error: networkError => {
            const retryForward = errorHandler({
              operation,
              networkError,
              //Network errors can return GraphQL errors on for example a 403
              graphQLErrors: networkError.result && networkError.result.errors,
              forward,
            });
            if (retryForward) {
              retrying = true;
              retrySub = retryForward.subscribe({
                next: result => observer.next(result),
                error: networkError => observer.error(networkError),
                complete: observer.complete.bind(observer),
              });
              return;
            }
            observer.error(networkError);
          },
          complete: () => {
            // disable the previous sub from calling complete on observable
            // if retry is in flight.
            if (!retrying) {
              observer.complete.bind(observer)();
            }
          },
        });
      } catch (e) {
        errorHandler({ networkError: e, operation, forward });
        observer.error(e);
      }

      return () => {
        if (sub) sub.unsubscribe();
        if (retrySub) sub.unsubscribe();
      };
    });
  });
};

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
