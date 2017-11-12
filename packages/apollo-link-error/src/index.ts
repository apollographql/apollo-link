import { ApolloLink, Observable, Operation } from 'apollo-link';
import { GraphQLError, ExecutionResult } from 'graphql';
import { empty } from 'rxjs/observable/empty';
import { _throw } from 'rxjs/observable/throw';
import { of } from 'rxjs/observable/of';
import { mergeMap } from 'rxjs/operators/mergeMap';
import { catchError } from 'rxjs/operators/catchError';

export interface ErrorResponse {
  graphQLErrors?: GraphQLError[];
  networkError?: Error;
  response?: ExecutionResult;
  operation: Operation;
}

export type ErrorHandler = (error: ErrorResponse) => void;

export const onError = (errorHandler: ErrorHandler): ApolloLink => {
  return new ApolloLink((operation, forward) => {
    return empty().pipe(
      mergeMap(() => {
        try {
          return forward(operation);
        } catch (e) {
          console.log('e', e);
          errorHandler({ networkError: e, operation });
          return _throw(e);
        }
      }),
      catchError(networkError => {
        console.log('catch', networkError);
        errorHandler({
          operation,
          networkError,
        });
        return _throw(networkError);
      }),
      mergeMap(result => {
        if (result.errors) {
          console.log('errors', result.errors);
          errorHandler({
            graphQLErrors: result.errors,
            response: result,
            operation,
          });
        }

        console.log('return', result);

        return of(result);
      }),
    );
  });
};

export class ErrorLink extends ApolloLink {
  private link: ApolloLink;
  constructor(errorHandler: ErrorHandler) {
    super();
    this.link = onError(errorHandler);
  }

  public request(operation, forward): Observable<ExecutionResult> | null {
    return this.link.request(operation, forward);
  }
}
