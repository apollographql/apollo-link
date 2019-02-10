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

    if ((<WebSocketLink.Configuration>paramsOrClient).uri !== undefined) {
      this.subscriptionClient = new SubscriptionClient(
        (<WebSocketLink.Configuration>paramsOrClient).uri,
        (<WebSocketLink.Configuration>paramsOrClient).options,
        (<WebSocketLink.Configuration>paramsOrClient).webSocketImpl,
      );
    } else {
      this.subscriptionClient = <SubscriptionClient>paramsOrClient;
    }
  }

  public request(operation: Operation): Observable<FetchResult> | null {
    return this.subscriptionClient.request(operation) as Observable<
      FetchResult
    >;
  }
}
