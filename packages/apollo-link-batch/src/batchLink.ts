import {
  ApolloLink,
  Operation,
  FetchResult,
  Observable,
  NextLink,
} from 'apollo-link';
import { OperationBatcher, BatchHandler } from './batching';

export { OperationBatcher, BatchableRequest, BatchHandler } from './batching';

export namespace BatchLink {
  export interface Options {
    /**
     * The interval at which to batch, in milliseconds.
     *
     * Defaults to 10.
     */
    batchInterval?: number;

    /**
     * The maximum number of operations to include in one fetch.
     *
     * Defaults to 0 (infinite operations within the interval).
     */
    batchMax?: number;

    /**
     * The handler that should execute a batch of operations.
     */
    batchHandler: BatchHandler;
  }
}

export class BatchLink extends ApolloLink {
  private batchInterval: number;
  private batchMax: number;
  private batcher: OperationBatcher;

  constructor(fetchParams: BatchLink.Options) {
    super();

    this.batchInterval = (fetchParams && fetchParams.batchInterval) || 10;
    this.batchMax = (fetchParams && fetchParams.batchMax) || 0;

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
      batchHandler: fetchParams.batchHandler,
    });

    if (fetchParams.batchHandler.length <= 1) {
      this.request = operation => this.batcher.enqueueRequest({ operation });
    }
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
