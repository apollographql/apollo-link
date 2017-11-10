import { ApolloLink, Operation, NextLink, GraphQLRequest } from 'apollo-link';
import { Observable } from 'rxjs/Observable';
import { tap, switchMap } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';

export type ContextSetter = (
  operation: GraphQLRequest,
  prevContext: any,
) => Observable<any> | Promise<any> | any;

export const setContext = (setter: ContextSetter): ApolloLink =>
  new ApolloLink((operation: Operation, forward: NextLink) => {
    const { ...request } = operation;

    return of(request).pipe(
      switchMap(req => {
        const res = setter(req, operation.getContext());
        return res.then ? res : of(res);
      }),
      tap(operation.setContext),
      switchMap(() => forward(operation)),
    );
  });
