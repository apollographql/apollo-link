const operationToPromise = (fetcher) => {
  return (operation) => {
    const observable = fetcher.request(operation);
    return new Promise((resolve, reject) => {
      observable.subscribe({
        next: resolve,
        error: reject,
      });
    });
  };
};

export function fetcherToNetworkInterface(fetcher) {
  const request = operationToPromise(fetcher);
  return {
    query: request,
  };
}

export function fetcherPromiseWrapper(fetcher) {
  return {
    request: operationToPromise(fetcher),
  };
}
