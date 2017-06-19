import {
  ApolloFetcher,
  Operation,
  Observable,
} from './types';
import HttpFetcher from './httpFetcher';
import 'isomorphic-fetch';

export default class AuthHttpFetcher implements ApolloFetcher {

  private httpFetcher: ApolloFetcher;
  private authToken: () => string;

  constructor(uri?: string, authToken?: () => string) {
    this.httpFetcher = new HttpFetcher({uri, fetch: this.myFetch});
    this.authToken = authToken;
  }

  public request(operation: Operation): Observable {
    return this.httpFetcher.request(operation);
  }

  private myFetch (input: RequestInfo, init: RequestInit = {}): Promise<Response> {
    //Middleware
    init.body = init.body || {};
    init.body.headers = init.body.headers || {};
    init.body.headers['authorization'] = this.authToken();

    return fetch(input, init)
      .then(response => {

        //Afterware
        if (response.status === 401) {
          //return logout();
          //return this.httpFetcher.request('logout');
          return new Response({
            ok: false,
          });
        }

        return response;
      });
  }
}
