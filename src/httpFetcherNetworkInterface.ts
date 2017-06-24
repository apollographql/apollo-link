import HttpFetcher from './httpFetcher';
import { fetcherToNetworkInterface } from './fetcher-as-promise';

export default function createHttpFetcherNetworkInterface (uri: string) {
  return fetcherToNetworkInterface(new HttpFetcher({uri}));
}
