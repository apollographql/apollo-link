import {
  ApolloLink,
  Operation,
  FetchResult,
  Observable,
} from 'apollo-link-core';

import { SubscriptionClient, ClientOptions } from 'subscriptions-transport-ws';

import { print } from 'graphql/language/printer';

export type WebSocketParams = {
  uri: string;
  options?: ClientOptions;
  webSocketImpl?: any;
  client?: SubscriptionClient;
};

/** Transforms Operation for into HTTP results.
 * context can include the headers property, which will be passed to the fetch function
 */
export default class WSLink extends ApolloLink {
  private subscriptionClient: SubscriptionClient;

  constructor({ uri, options, webSocketImpl, client }: WebSocketParams) {
    super();

    this.subscriptionClient =
      client || new SubscriptionClient(uri, options, webSocketImpl);
  }

  public request(operation: Operation): Observable<FetchResult> | null {
    if (operation.operationType && operation.operationType === 'subscription') {
      return new Observable(observer => {
        const id = this.subscriptionClient.subscribe(
          {
            ...operation,
            query: print(operation),
          },
          (error, result) => {
            observer.next({
              data: result,
              errors: error,
            });
          },
        );

        return () => {
          this.subscriptionClient.unsubscribe(id);
        };
      });
    } else {
      return new Observable(observer => {
        this.subscriptionClient
          .query({
            ...operation,
            query: print(operation),
          })
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
}
