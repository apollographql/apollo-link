import { ApolloLink, Operation, FetchResult, Observable } from 'apollo-link';
import { createAsyncIterator, forAwaitEach, isAsyncIterable } from 'iterall';
import { execute, subscribe, GraphQLSchema, DocumentNode } from 'graphql';
import { getMainDefinition } from 'apollo-utilities';

const isSubscription = (query: DocumentNode) => {
  const main = getMainDefinition(query);
  return (
    main.kind === 'OperationDefinition' && main.operation === 'subscription'
  );
};

export namespace SchemaLink {
  export type ResolverContextFunction = (
    operation: Operation,
  ) => Record<string, any>;

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
    context?: ResolverContextFunction | Record<string, any>;
  }
}

export class SchemaLink extends ApolloLink {
  public schema: GraphQLSchema;
  public rootValue: any;
  public context: SchemaLink.ResolverContextFunction | any;

  constructor({ schema, rootValue, context }: SchemaLink.Options) {
    super();

    this.schema = schema;
    this.rootValue = rootValue;
    this.context = context;
  }

  public request(operation: Operation): Observable<FetchResult> | null {
    return new Observable<FetchResult>(observer => {
      const executor: any = isSubscription(operation.query)
        ? subscribe
        : execute;

      const context =
        typeof this.context === 'function'
          ? this.context(operation)
          : this.context;

      const result = executor(
        this.schema,
        operation.query,
        this.rootValue,
        context,
        operation.variables,
        operation.operationName,
      );

      Promise.resolve(result)
        .then(data => {
          const iterable = isAsyncIterable(data)
            ? data
            : createAsyncIterator([data]);

          forAwaitEach(iterable as any, value => observer.next(value))
            .then(() => observer.complete())
            .catch(error => observer.error(error));
        })
        .catch(error => observer.error(error));
    });
  }
}

export default SchemaLink;
