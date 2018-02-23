import { ApolloLink, Operation, FetchResult, Observable } from 'apollo-link';
import { SubscriptionClient, ClientOptions } from 'subscriptions-transport-ws';
import { ListenerFn } from 'eventemitter3';

export namespace WebSocketLink {
  /**
   * Configuration to use when constructing the subscription client (subscriptions-transport-ws).
   */
  export interface Configuration {
    /**
     * The endpoint to connect to.
     */
    uri: string;

    /**
     * Options to pass when constructing the subscription client.
     */
    options?: ClientOptions;

    /**
     * A custom WebSocket implementation to use.
     */
    webSocketImpl?: any;
  }
}

// For backwards compatibility.
export import WebSocketParams = WebSocketLink.Configuration;

export type WebSocketLinkOptions = {
  requeryOnReconnect?: (operation: Operation) => Boolean;
};

export class WebSocketLink extends ApolloLink {
  private subscriptionClient: SubscriptionClient;
  private requeryOnReconnect?: (operation: Operation) => Boolean;

  constructor(
    paramsOrClient: WebSocketLink.Configuration | SubscriptionClient,
    options: WebSocketLinkOptions = {},
  ) {
    super();
    if (paramsOrClient instanceof SubscriptionClient) {
      this.subscriptionClient = paramsOrClient;
    } else {
      this.subscriptionClient = new SubscriptionClient(
        paramsOrClient.uri,
        paramsOrClient.options,
        paramsOrClient.webSocketImpl,
      );
    }
    this.requeryOnReconnect = options.requeryOnReconnect;
  }
  public on(eventName: string, callback: ListenerFn, context?: any) {
    return this.subscriptionClient.on(eventName, callback, context);
  }
  public request(operation: Operation): Observable<FetchResult> | null {
    const request = () => {
      return this.subscriptionClient.request(operation) as Observable<
        FetchResult
      >;
    };
    if (this.requeryOnReconnect && this.requeryOnReconnect(operation)) {
      return new Observable<FetchResult>(obs => {
        const off = this.subscriptionClient.on('reconnected', () => {
          request().subscribe(
            result => {
              obs.next(result);
            },
            err => obs.error(err),
          );
        });
        request().subscribe(result => obs.next(result));
        return () => {
          off();
        };
      });
    }

    return request();
  }
}
