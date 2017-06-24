import BatchHttpFetcher from './batchHttpFetcher';
import { fetcherToNetworkInterface } from './fetcher-as-promise';

export default function createBatchHttpFetcherNetworkInterface (uri: string) {
  return fetcherToNetworkInterface(new BatchHttpFetcher({uri}));
}
