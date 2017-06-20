export default function FetcherPromiseWrapper(fetcher) {
  return {
    request: (operation) => {
      const observable = fetcher.request(operation);
      return new Promise((resolve, reject) => {
        observable.subscribe({ next: resolve, error: reject });
      });
    },
  };
}
