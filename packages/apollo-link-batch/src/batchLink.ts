import {
  ApolloLink,
  Operation,
  FetchResult,
  Observable,
  NextLink,
} from 'apollo-link-core';
import { QueryBatcher, BatchOperation } from './batching';

export default class BatchLink extends ApolloLink {
  private batchOperation: BatchOperation;
  private batchInterval: number;
  private batchMax: number;
  private batcher: QueryBatcher;

  constructor(fetchParams?: {
    batchInterval: number;
    batchMax: number;
    batchOperation?: BatchOperation;
  }) {
    super();

    this.batchInterval = fetchParams.batchInterval || 10;
    this.batchMax = fetchParams.batchMax || 10;

    if (typeof this.batchInterval !== 'number') {
      throw new Error(
        `batchInterval must be a number, got ${this.batchInterval}`,
      );
    }

    if (typeof this.batchMax !== 'number') {
      throw new Error(`batchMax must be a number, got ${this.batchMax}`);
    }

    this.batcher = new QueryBatcher({
      batchInterval: this.batchInterval,
      batchMax: this.batchMax,
      batchOperation: this.batchOperation,
    });
  }

  public request(
    operation: Operation,
    forward?: NextLink,
  ): Observable<FetchResult> | null {
    return this.batcher.enqueueRequest(operation, forward);
  }
}
