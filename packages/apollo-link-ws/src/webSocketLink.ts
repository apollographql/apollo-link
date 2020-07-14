import { ApolloLink, Operation, FetchResult, Observable } from 'apollo-link';

import { SubscriptionClient, ClientOptions } from 'subscriptions-transport-ws';

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
    
    
    /**
     * Passed in as the second option of the WebSocket implementation.
     * On the browser it is wsProtocols but in Node it's implementation specific.
     */
    webSocketImplOptions?: any;
  }
}

// For backwards compatibility.
export import WebSocketParams = WebSocketLink.Configuration;

export class WebSocketLink extends ApolloLink {
  private subscriptionClient: SubscriptionClient;

  constructor(
    paramsOrClient: WebSocketLink.Configuration | SubscriptionClient,
  ) {
    super();

    if (paramsOrClient instanceof SubscriptionClient) {
      this.subscriptionClient = paramsOrClient;
    } else {
      this.subscriptionClient = new SubscriptionClient(
        paramsOrClient.uri,
        paramsOrClient.options,
        paramsOrClient.webSocketImpl,
        paramsOrClient.webSocketImplOptions,
      );
    }
  }

  public request(operation: Operation): Observable<FetchResult> | null {
    return this.subscriptionClient.request(operation) as Observable<
      FetchResult
    >;
  }
}
