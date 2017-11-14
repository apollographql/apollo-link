import { ApolloLink, Observable, Operation } from 'apollo-link';
import { GraphQLError, ExecutionResult } from 'graphql';
import { empty } from 'rxjs/observable/empty';
import { _throw } from 'rxjs/observable/throw';
import { of } from 'rxjs/observable/of';
import { tap } from 'rxjs/operators/tap';
// import { mergeMap } from "rxjs/operators/mergeMap";
import { switchMap } from 'rxjs/operators/switchMap';
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
    console.log('operation');
    return empty().pipe(
      tap(v => {
        console.log('tap 1', v);
      }),
      switchMap(() => {
        try {
          console.log('1');
          return forward(operation);
        } catch (e) {
          console.log('e', e);
          errorHandler({ networkError: e, operation });
          return _throw(e);
        }
      }),
      tap(v => {
        console.log('tap 2', v);
      }),
      catchError(networkError => {
        console.log('catch', networkError);
        errorHandler({
          operation,
          networkError,
        });
        return _throw(networkError);
      }),
      tap(v => {
        console.log('tap 3', v);
      }),
      switchMap(result => {
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
      tap(v => {
        console.log('tap 4', v);
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
