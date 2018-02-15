import { ApolloLink, Observable, RequestHandler } from 'apollo-link';
import {
  serializeBody,
  selectURI,
  parseAndCheckResponse,
  selectOptionsAndBody,
  createSignalIfSupported,
  LinkUtils,
} from 'apollo-link-utilities';

export namespace HttpLink {
  export interface UriFunction extends LinkUtils.UriFunction {}
  export interface Options extends LinkUtils.Options {}
}

// For backwards compatibility.
export import FetchOptions = HttpLink.Options;
export import UriFunction = HttpLink.UriFunction;

export const createHttpLink = (linkOptions: HttpLink.Options = {}) => {
  let {
    uri = '/graphql',
    // use default global fetch is nothing passed in
    fetch: fetcher = fetch,
    includeExtensions,
    ...requestOptions
  } = linkOptions;

  const linkConfig = {
    http: { includeExtensions },
    options: requestOptions.fetchOptions,
    credentials: requestOptions.credentials,
    headers: requestOptions.headers,
  };

  return new ApolloLink(operation => {
    const chosenURI = selectURI(operation, uri);

    const context = operation.getContext();

    const contextConfig = {
      http: context.http,
      options: context.fetchOptions,
      credentials: context.credentials,
      headers: context.headers,
    };

    //uses fallback, link, and then context to build options
    const { options, body } = selectOptionsAndBody(
      operation,
      LinkUtils.fallbackConfig,
      linkConfig,
      contextConfig,
    );

    return new Observable(observer => {
      const { controller, signal } = createSignalIfSupported();
      if (controller) (options as any).signal = signal;

      (options as any).body = serializeBody(body);

      fetcher(chosenURI, options)
        .then(response => {
          operation.setContext({ response });
          return response;
        })
        .then(parseAndCheckResponse(operation))
        .then(result => {
          // we have data and can send it to back up the link chain
          observer.next(result);
          observer.complete();
          return result;
        })
        .catch(err => {
          // fetch was cancelled so its already been cleaned up in the unsubscribe
          if (err.name === 'AbortError') return;
          // if it is a network error, BUT there is graphql result info
          // fire the next observer before calling error
          // this gives apollo-client (and react-apollo) the `graphqlErrors` and `networErrors`
          // to pass to UI
          if (err.result && err.result.errors) {
            // if we dont' call next, the UI can only show networkError because AC didn't
            // get andy graphqlErrors
            // this is graphql execution result info (i.e errors and possibly data)
            // this is because there is no formal spec how errors should translate to
            // http status codes. So an auth error (401) could have both data
            // from a public field, errors from a private field, and a status of 401
            // {
            //  user { // this will have errors
            //    firstName
            //  }
            //  products { // this is public so will have data
            //    cost
            //  }
            // }
            //
            // the result of above *could* look like this:
            // {
            //   data: { products: [{ cost: "$10" }] },
            //   errors: [{
            //      message: 'your session has timed out',
            //      path: []
            //   }]
            // }
            // status code of above would be a 401
            // in the UI you want to show data where you can, errors as data where you can
            // and use correct http status codes
            observer.next(err.result);
          }
          observer.error(err);
        });

      return () => {
        // XXX support canceling this request
        // https://developers.google.com/web/updates/2017/09/abortable-fetch
        if (controller) controller.abort();
      };
    });
  });
};

export class HttpLink extends ApolloLink {
  public requester: RequestHandler;
  constructor(opts?: HttpLink.Options) {
    super(createHttpLink(opts).request);
  }
}
