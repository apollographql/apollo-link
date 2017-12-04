import { ApolloLink, Observable, Operation } from 'apollo-link';
import { GraphQLError, ExecutionResult } from 'graphql';

export interface ErrorResponse {
  graphQLErrors?: GraphQLError[];
  networkError?: Error;
  response?: ExecutionResult;
  operation: Operation;
}

export namespace ErrorLink {
  /**
   * Callback to be triggered when an error occurs within the link stack.
   */
  export interface ErrorHandler {
    (error: ErrorResponse): void;
  }
}

// For backwards compatibility.
export import ErrorHandler = ErrorLink.ErrorHandler;

export const onError = (errorHandler: ErrorHandler): ApolloLink => {
  return new ApolloLink((operation, forward) => {
    return new Observable(observer => {
      let sub;
      try {
        sub = forward(operation).subscribe({
          next: result => {
            if (result.errors) {
              errorHandler({
                graphQLErrors: result.errors,
                response: result,
                operation,
              });
            }
            observer.next(result);
          },
          error: networkError => {
            errorHandler({
              operation,
              networkError,
              //Network errors can return GraphQL errors on for example a 403
              graphQLErrors: networkError.result && networkError.result.errors,
            });
            observer.error(networkError);
          },
          complete: observer.complete.bind(observer),
        });
      } catch (e) {
        errorHandler({ networkError: e, operation });
        observer.error(e);
      }

      return () => {
        if (sub) sub.unsubscribe();
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

  public request(operation, forward): Observable<ExecutionResult> | null {
    return this.link.request(operation, forward);
  }
}
