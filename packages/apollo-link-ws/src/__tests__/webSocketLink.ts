import { SubscriptionClient } from 'subscriptions-transport-ws';
import { Observable, execute } from 'apollo-link';
import { ExecutionResult } from 'graphql';

import { WebSocketLink } from '../webSocketLink';

const query = `
  query SampleQuery {
    stub {
      id
    }
  }
`;

const mutation = `
  mutation SampleMutation {
    stub {
      id
    }
  }
`;

const subscription = `
  subscription SampleSubscription {
    stub {
      id
    }
  }
`;

describe('WebSocketLink', () => {
  it('constructs', () => {
    const client: any = {};
    client.__proto__ = SubscriptionClient.prototype;
    expect(() => new WebSocketLink(client, {})).not.toThrow();
  });

  // TODO some sort of dependency injection

  // it('should pass the correct initialization parameters to the Subscription Client', () => {
  // });

  it('should call request on the client for a query', done => {
    const result = { data: { data: 'result' } };
    const client: any = {};
    const observable = Observable.of(result);
    client.__proto__ = SubscriptionClient.prototype;
    client.request = jest.fn();
    client.request.mockReturnValueOnce(observable);
    const link = new WebSocketLink(client, {});

    const obs = execute(link, { query });
    expect(obs).toEqual(observable);
    obs.subscribe(data => {
      expect(data).toEqual(result);
      expect(client.request).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it('should call query on the client for a mutation', done => {
    const result = { data: { data: 'result' } };
    const client: any = {};
    const observable = Observable.of(result);
    client.__proto__ = SubscriptionClient.prototype;
    client.request = jest.fn();
    client.request.mockReturnValueOnce(observable);
    const link = new WebSocketLink(client, {});

    const obs = execute(link, { query: mutation });
    expect(obs).toEqual(observable);
    obs.subscribe(data => {
      expect(data).toEqual(result);
      expect(client.request).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it('should call request on the subscriptions client for subscription', done => {
    const result = { data: { data: 'result' } };
    const client: any = {};
    const observable = Observable.of(result);
    client.__proto__ = SubscriptionClient.prototype;
    client.request = jest.fn();
    client.request.mockReturnValueOnce(observable);
    const link = new WebSocketLink(client, {});

    const obs = execute(link, { query: mutation });
    expect(obs).toEqual(observable);
    obs.subscribe(data => {
      expect(data).toEqual(result);
      expect(client.request).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it('should call next with multiple results for subscription', done => {
    const results = [
      { data: { data: 'result1' } },
      { data: { data: 'result2' } },
    ];
    const client: any = {};
    client.__proto__ = SubscriptionClient.prototype;
    client.request = jest.fn(() => {
      const copy = [...results];
      return new Observable<ExecutionResult>(observer => {
        observer.next(copy[0]);
        observer.next(copy[1]);
      });
    });

    const link = new WebSocketLink(client, {});

    execute(link, { query: subscription }).subscribe(data => {
      expect(client.request).toHaveBeenCalledTimes(1);
      expect(data).toEqual(results.shift());
      if (results.length === 0) {
        done();
      }
    });
  });
  it('should call callbacks on subscription client state changing', () => {
    const client: any = {};
    client.__proto__ = SubscriptionClient.prototype;
    client.on = jest.fn();
    const connectionCallback = jest.fn();
    const link = new WebSocketLink(client, {
      connectionCallback,
    });
    expect(client.on).toHaveBeenCalledTimes(5);

    expect(client.on.mock.calls[0][0]).toEqual('connected');
    client.on.mock.calls[0][1]();
    expect(connectionCallback).toHaveBeenCalledTimes(1);
    expect(connectionCallback.mock.calls[0][0]).toEqual('connected');

    expect(client.on.mock.calls[1][0]).toEqual('connecting');
    client.on.mock.calls[1][1]();
    expect(connectionCallback).toHaveBeenCalledTimes(2);
    expect(connectionCallback.mock.calls[1][0]).toEqual('connecting');

    expect(client.on.mock.calls[2][0]).toEqual('reconnected');
    client.on.mock.calls[2][1]();
    expect(connectionCallback).toHaveBeenCalledTimes(3);
    expect(connectionCallback.mock.calls[2][0]).toEqual('reconnected');

    expect(client.on.mock.calls[3][0]).toEqual('reconnecting');
    client.on.mock.calls[3][1]();
    expect(connectionCallback).toHaveBeenCalledTimes(4);
    expect(connectionCallback.mock.calls[3][0]).toEqual('reconnecting');

    expect(client.on.mock.calls[4][0]).toEqual('disconnected');
    client.on.mock.calls[4][1]();
    expect(connectionCallback).toHaveBeenCalledTimes(5);
    expect(connectionCallback.mock.calls[4][0]).toEqual('disconnected');
  });
  it('should call request on the client for a query and then requery', done => {
    console.log('TEST here');
    const result = { data: { data: 'result' } };
    const client: any = {};
    const observable = Observable.of(result);

    const result1 = { data: { data: 'result1' } };
    const observable1 = Observable.of(result1);

    client.__proto__ = SubscriptionClient.prototype;
    client.request = jest.fn();
    client.on = jest.fn();
    client.request
      .mockReturnValueOnce(observable)
      .mockReturnValueOnce(observable1);
    const isRequeried = jest.fn().mockReturnValue(true);
    const link = new WebSocketLink(client, { isRequeried });

    const obs = execute(link, { query });
    expect(isRequeried).toHaveBeenCalledTimes(1);
    expect(isRequeried.mock.calls[0][0]).toMatchObject({ query });
    let count = 0;
    obs.subscribe(data => {
      if (count === 0) {
        expect(data).toEqual(result);
        expect(client.request).toHaveBeenCalledTimes(1);
        expect(client.on).toHaveBeenCalledTimes(1);
        setTimeout(() => client.on.mock.calls[0][1](), 1);
      }
      if (count === 1) {
        expect(data).toEqual(result1);
        expect(client.request).toHaveBeenCalledTimes(2);
        done();
      }
      count += 1;
    });
  });
});
