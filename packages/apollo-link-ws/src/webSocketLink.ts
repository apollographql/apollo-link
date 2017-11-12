import { ApolloLink, Operation, FetchResult, Observable } from 'apollo-link';
import { SubscriptionClient, ClientOptions } from 'subscriptions-transport-ws';

export type WebSocketParams = {
  uri: string;
  options?: ClientOptions;
  webSocketImpl?: any;
};

export type WebSocketLinkOptions = {
  connectionCallback?: (connectionState: String) => void;
  isRequeried?: (operation: Operation) => Boolean;
};


export class WebSocketLink extends ApolloLink {
  private subscriptionClient: SubscriptionClient;
  private isRequeried: (operation: Operation) => Boolean;
  constructor(
    paramsOrClient: SubscriptionClient | WebSocketParams,
    options: WebSocketLinkOptions,
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
    this.isRequeried = options.isRequeried;
    if (options.connectionCallback) {
      this.subscriptionClient.on(
        'connected',
        () => options.connectionCallback('connected'),
      );
      this.subscriptionClient.on(
        'connecting',
        () => options.connectionCallback('connecting'),
      );
      this.subscriptionClient.on(
        'reconnected',
          () => options.connectionCallback('reconnected'),
      );
      this.subscriptionClient.on(
        'reconnecting',
        () => options.connectionCallback('reconnecting'),
      )
      this.subscriptionClient.on(
        'disconnected',
        () => options.connectionCallback('disconnected'),
      )
    }
  }

  public request(operation: Operation): Observable<FetchResult> | null {
    const request = () => this.subscriptionClient
      .request(operation) as Observable<
        FetchResult
      >;
    if(this.isRequeried && this.isRequeried(operation)) {
        return new Observable<
          FetchResult
        >(obs => {
          const off = this.subscriptionClient
            .on('reconnected', () => {
              request() 
                .subscribe(result => obs.next(result));
              });
          request()
            .subscribe(result => obs.next(result)); 
          return () => off();
        })
      }
      
    return request();
  }
}
