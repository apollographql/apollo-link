import { ApolloLink, Operation, FetchResult, Observable } from 'apollo-link';

import { SubscriptionClient, ClientOptions } from 'subscriptions-transport-ws';

export type WebSocketParams = {
  uri: string;
  options?: ClientOptions;
  webSocketImpl?: any;
};

export class WebSocketLink extends ApolloLink {
  private subscriptionClient: SubscriptionClient;

  constructor(paramsOrClient: WebSocketParams | SubscriptionClient) {
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
  }

  public request(operation: Operation): Observable<FetchResult> | null {
    return this.subscriptionClient.request(operation) as Observable<
      FetchResult
    >;
  }
}
