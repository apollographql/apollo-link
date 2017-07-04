const operationToPromise = (link) => {
  return (operation) => {
    const observable = link.request(operation);
    return new Promise((resolve, reject) => {
      observable.subscribe({
        next: resolve,
        error: reject,
      });
    });
  };
};

export function linkToNetworkInterface(link) {
  const request = operationToPromise(link);
  return {
    query: request,
  };
}

export function linkPromiseWrapper(link) {
  return {
    request: operationToPromise(link),
  };
}
