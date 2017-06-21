export default function FetcherPromiseWrapper(fetcher) {
  const operationToPromise = (operation) => {
    const observable = fetcher.request(operation);
    return new Promise((resolve, reject) => {
      observable.subscribe({
        next: resolve,
        error: reject,
      });
    });
  };
  return {
    query: operationToPromise, // to conform with Apollo Client's NetworkInterface
    request: operationToPromise,
  };
}
