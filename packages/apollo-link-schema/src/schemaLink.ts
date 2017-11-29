import { ApolloLink, Operation, FetchResult, Observable } from 'apollo-link';

import { print } from 'graphql/language/printer';
import { graphql, GraphQLSchema } from 'graphql';

export class SchemaLink extends ApolloLink {
  public schema: GraphQLSchema;
  public rootValue: any;
  public context: any;

  constructor({
    schema,
    rootValue,
    context
  }: {
    schema: GraphQLSchema;
    rootValue?: any;
    context?: any;
  }) {
    super();

    this.schema = schema;
    this.rootValue = rootValue;
    this.context = context;
  }

  public request(operation: Operation): Observable<FetchResult> | null {
    const request = {
      ...operation,
      query: print(operation.query)
    };

    return new Observable<FetchResult>(observer => {
      graphql(
        this.schema,
        request.query,
        this.rootValue,
        this.context,
        request.variables,
        request.operationName
      )
        .then(data => {
          if (!observer.closed) {
            observer.next(data);
            observer.complete();
          }
        })
        .catch(error => {
          if (!observer.closed) {
            observer.error(error);
          }
        });
    });
  }
}

export default SchemaLink;
