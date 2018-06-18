import {
  ApolloLink,
  Operation,
  FetchResult,
  Observable,
  isPromise,
} from 'apollo-link';
import { execute, GraphQLSchema } from 'graphql';
import { from, of } from 'rxjs';

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
    const result = execute(
      this.schema,
      operation.query,
      this.rootValue,
      typeof this.context === 'function'
        ? this.context(operation)
        : this.context,
      operation.variables,
      operation.operationName,
    );

    if (isPromise(result)) {
      return from<FetchResult>(result);
    }

    return of<FetchResult>(result);
  }
}

export default SchemaLink;
