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

export type WebSocketLinkOptions = {
  connectionCallback?: (connectionState: String) => void;
  isRequeried?: (operation: Operation) => Boolean;
};


export class WebSocketLink extends ApolloLink {
  private subscriptionClient: SubscriptionClient;
  private isRequeried?: (operation: Operation) => Boolean;

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
    console.log({ itis: 'options', options })
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
    const request = (requerying) => {
      return this.subscriptionClient
        .request(operation) as Observable<
          FetchResult
        >;
    };
    if(this.isRequeried && this.isRequeried(operation)) {
        // console.log('reques from...', new Error().stack)
        return new Observable<
          FetchResult
        >(obs => {
          console.log('getting requeried subscrioption');
          console.log(new Error().stack);
          const off = 
            this.subscriptionClient
              .on('reconnected', () => {
                console.log('requerying!!!!');
                request(true)
                  .subscribe(
                    result => {
                      console.log({ result })
                      obs.next(result);
                    },
                    err => console.log({ err }),
                    () => console.log('requerying complete'),
                  );
                });
          request(false)
            .subscribe(result => obs.next(result));
          return () => {
            console.log('disposing requreried subscription');
            console.log(new Error().stack);
            off();
          }
        })
      }

    return request(false);
  }
}
