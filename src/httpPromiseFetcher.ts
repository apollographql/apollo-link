import HttpFetcher from './httpFetcher';
import FetcherPromiseWrapper from './fetcher-as-promise';

export default function HttpPromiseFetcher(uri: string) {
  return FetcherPromiseWrapper(new HttpFetcher({uri}));
}
