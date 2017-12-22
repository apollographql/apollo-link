import { ApolloLink, Operation, FetchResult, Observable } from 'apollo-link';
import { execute, GraphQLSchema } from 'graphql';

export namespace SchemaLink {
  export interface Options {
    /**
     * The schema to generate responses from.
     */
    schema: GraphQLSchema;

    /**
     * The root value to use when generating responses.
     */
    rootValue?: any;

    /**
     * A context to provide to resolvers declared within the schema.
     */
    context?: any;
  }
}

export class SchemaLink extends ApolloLink {
  public schema: GraphQLSchema;
  public rootValue: any;
  public context: any;

  constructor({ schema, rootValue, context }: SchemaLink.Options) {
    super();

    this.schema = schema;
    this.rootValue = rootValue;
    this.context = context;
  }

  public request(operation: Operation): Observable<FetchResult> | null {
    return new Observable<FetchResult>(observer => {
      Promise.resolve(
        execute(
          this.schema,
          operation.query,
          this.rootValue,
          this.context || operation.getContext(),
          operation.variables,
          operation.operationName,
        ),
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
