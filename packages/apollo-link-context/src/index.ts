import {
  ApolloLink,
  Observable,
  Operation,
  NextLink,
  GraphQLRequest,
} from 'apollo-link';

export type ContextSetter = (
  operation: GraphQLRequest,
  prevContext: any,
) => Promise<any> | any;

export const setContext = (setter: ContextSetter): ApolloLink =>
  new ApolloLink((operation: Operation, forward: NextLink) => {
    const { ...request } = operation;

    return new Observable(observer => {
      let handle;
      Promise.resolve(request)
        .then(req => setter(req, operation.getContext()))
        .then(operation.setContext)
        .then(() => {
          handle = forward(operation).subscribe({
            next: observer.next.bind(observer),
            error: observer.error.bind(observer),
            complete: observer.complete.bind(observer),
          });
        })
        .catch(observer.error.bind(observer));

      return () => {
        if (handle) handle.unsubscribe();
      };
    });
  });
