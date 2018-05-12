import { ApolloLink, Observable, Operation, NextLink } from 'apollo-link';

export interface Actions<TValue = any> {
  next(value: TValue): void;
  error(errorValue: any): void;
  retry(): void;
  complete(): void;
  cancel(): void;
}

export interface Interceptor<TValue> {
  next(value: TValue, actions: Actions<TValue>): void | Promise<void>;
  error(errorValue: any, actions: Actions<TValue>): void | Promise<void>;
  complete(actions: Actions<TValue>): void | Promise<void>;
  canceled(): void;
}

export type InterceptorFactory<TValue> = (
  operation: Operation,
) => Partial<Interceptor<TValue>>;

export const interceptLink = <T>(
  interceptorFactory: InterceptorFactory<T>,
): ApolloLink => {
  return new ApolloLink((operation, forward) => {
    const interceptedOperation = new InterceptableOperation(
      operation,
      forward,
      interceptorFactory,
    );
    interceptedOperation.start();
    return interceptedOperation.observe();
  });
};

class InterceptableOperation<TValue = any> {
  private actions: Actions<TValue>;
  private interceptor: Interceptor<TValue>;

  private values: TValue[] = [];
  private error: any;
  private complete = false;
  private canceled = false;
  private observers: ZenObservable.Observer<TValue>[] = [];
  private currentSubscription: ZenObservable.Subscription = null;

  constructor(
    private operation: Operation,
    private forward: NextLink,
    interceptorFactory: InterceptorFactory<TValue>,
  ) {
    this.actions = {
      next: this.deliverNext,
      error: this.deliverError,
      complete: this.deliverComplete,
      retry: this.try,
      cancel: this.cancel,
    };

    const interceptor = interceptorFactory(operation);

    this.interceptor = {
      next:
        interceptor.next ||
        ((value: TValue, { next }: Actions<TValue>) => next(value)),
      error:
        interceptor.error ||
        ((err: TValue, { error }: Actions<TValue>) => error(err)),
      complete:
        interceptor.complete || (({ complete }: Actions<TValue>) => complete()),
      canceled: interceptor.canceled || (() => undefined),
    };
  }

  public observe(): Observable<TValue> {
    return new Observable(observer => {
      this.subscribe(observer);
      return () => {
        this.unsubscribe(observer);
      };
    });
  }

  /**
   * Register a new observer for this operation.
   *
   * If the operation has previously emitted other events, they will be
   * immediately triggered for the observer.
   */
  public subscribe(observer: ZenObservable.Observer<TValue>) {
    if (this.canceled) {
      throw new Error(
        `Subscribing to an interceptor link that was canceled is not supported`,
      );
    }
    this.observers.push(observer);

    // If we've already begun, catch this observer up.
    for (const value of this.values) {
      observer.next(value);
    }

    if (this.complete) {
      observer.complete();
    } else if (this.error) {
      observer.error(this.error);
    }
  }

  /**
   * Remove a previously registered observer from this operation.
   *
   * If no observers remain, the operation will stop retrying, and unsubscribe
   * from its downstream link.
   */
  public unsubscribe(observer: ZenObservable.Observer<TValue>) {
    const index = this.observers.indexOf(observer);
    if (index < 0) {
      throw new Error(
        `Attempting to unsubscribe unknown observer from an interceptor link.`,
      );
    }
    // Note that we are careful not to change the order of length of the array,
    // as we are often mid-iteration when calling this method.
    this.observers[index] = null;

    // If this is the last observer, we're done.
    if (this.observers.every(o => o === null)) {
      this.cancel();
    }
  }

  /**
   * Start the initial request.
   */
  public start() {
    if (this.currentSubscription) return; // Already started.

    this.try();
  }

  /**
   * Stop retrying for the operation, and cancel any in-progress requests.
   */
  private cancel = () => {
    if (this.currentSubscription) {
      this.currentSubscription.unsubscribe();
    }
    this.currentSubscription = null;
    this.canceled = true;

    this.interceptor.canceled();
  };

  private try = () => {
    this.currentSubscription = this.forward(this.operation).subscribe({
      next: this.onNext,
      error: this.onError,
      complete: this.onComplete,
    });
  };

  private onNext = async (value: TValue) => {
    await this.interceptor.next(value, this.actions);
  };

  private deliverNext = (value: TValue) => {
    this.values.push(value);
    for (const observer of this.observers) {
      if (!observer) continue;
      observer.next(value);
    }
  };

  private onError = async error => {
    await this.interceptor.error(error, this.actions);
  };

  private deliverError = error => {
    this.error = error;
    for (const observer of this.observers) {
      if (!observer) continue;
      observer.error(error);
    }
  };

  private onComplete = () => {
    this.interceptor.complete(this.actions);
  };

  private deliverComplete = () => {
    this.complete = true;
    for (const observer of this.observers) {
      if (!observer) continue;
      observer.complete();
    }
  };
}
