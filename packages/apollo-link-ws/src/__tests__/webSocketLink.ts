import { SubscriptionClient } from 'subscriptions-transport-ws';
import { Observable, execute } from 'apollo-link';
import { ExecutionResult } from 'graphql';

import { WebSocketLink } from '../webSocketLink';
import { OBJECT_TYPE_EXTENSION } from 'graphql/language/kinds';

jest.mock('subscriptions-transport-ws');

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

const uri = 'mariana was here';

describe('WebSocketLink', () => {
  beforeEach(() => {
    SubscriptionClient.mockClear();
  });

  it('constructs with a client supplied', () => {
    const client = new SubscriptionClient({ uri });

    expect(() => new WebSocketLink(client)).not.toThrow();
  });

  // TODO some sort of dependency injection

  it('should initialize a Subscription Client', () => {
    const link = new WebSocketLink({ uri });

    expect(SubscriptionClient).toHaveBeenCalledTimes(1);
  });

  it('should call request on the client for a query', done => {
    const result = { data: { data: 'result' } };
    const client = new SubscriptionClient(uri);
    const observable = Observable.of(result);

    client.request.mockReturnValue(observable);

    const link = new WebSocketLink(client);
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
    const client = new SubscriptionClient(uri);
    const observable = Observable.of(result);

    client.request.mockReturnValue(observable);

    const link = new WebSocketLink(client);
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
    const client = new SubscriptionClient(uri);
    const observable = Observable.of(result);

    client.request.mockReturnValue(observable);

    const link = new WebSocketLink(client);
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
    const client = new SubscriptionClient(uri);

    client.request = jest.fn(() => {
      const copy = [...results];
      return new Observable<ExecutionResult>(observer => {
        observer.next(copy[0]);
        observer.next(copy[1]);
      });
    });

    const link = new WebSocketLink(client);

    execute(link, { query: subscription }).subscribe(data => {
      expect(client.request).toHaveBeenCalledTimes(1);
      expect(data).toEqual(results.shift());
      if (results.length === 0) {
        done();
      }
    });
  });

  it('should close the client WebSocket connection', () => {
    const client = new SubscriptionClient(uri);

    client.close = jest.fn();

    const link = new WebSocketLink(client);

    link.close();

    expect(client.close).toHaveBeenCalledTimes(1);
    expect(client.close).toHaveBeenCalledWith(undefined, undefined);
  });

  it('should close the client WebSocket connection with proper params', () => {
    const client = new SubscriptionClient(uri);

    client.close = jest.fn();

    const link = new WebSocketLink(client);

    link.close(true, true);

    expect(client.close).toHaveBeenCalledTimes(1);
    expect(client.close).toHaveBeenCalledWith(true, true);
  });
});
