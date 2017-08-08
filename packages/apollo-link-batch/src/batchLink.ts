import {
  ApolloLink,
  Operation,
  FetchResult,
  Observable,
  NextLink,
} from 'apollo-link-core';
import { OperationBatcher, BatchHandler } from './batching';

export { OperationBatcher, BatchableRequest, BatchHandler } from './batching';

export default class BatchLink extends ApolloLink {
  private batchHandler: BatchHandler;
  private batchInterval: number;
  private batchMax: number;
  private batcher: OperationBatcher;

  constructor(fetchParams?: {
    batchInterval: number;
    batchMax: number;
    batchHandler?: BatchHandler;
  }) {
    super();

    this.batchInterval = fetchParams.batchInterval || 10;
    this.batchMax = fetchParams.batchMax || 0;

    if (typeof this.batchInterval !== 'number') {
      throw new Error(
        `batchInterval must be a number, got ${this.batchInterval}`,
      );
    }

    if (typeof this.batchMax !== 'number') {
      throw new Error(`batchMax must be a number, got ${this.batchMax}`);
    }

    this.batcher = new OperationBatcher({
      batchInterval: this.batchInterval,
      batchMax: this.batchMax,
      batchHandler: this.batchHandler,
    });
  }

  public request(
    operation: Operation,
    forward?: NextLink,
  ): Observable<FetchResult> | null {
    return this.batcher.enqueueRequest({
      operation,
      forward,
    });
  }
}
