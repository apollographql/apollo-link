import { ApolloLink, Operation, FetchResult, Observable } from 'apollo-link';
import { graphql, execute, GraphQLSchema } from 'graphql';

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
    return new Observable<FetchResult>(observer => {
      execute(
        this.schema,
        operation.query,
        this.rootValue,
        this.context,
        operation.variables,
        operation.operationName
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
