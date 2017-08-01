import { assert } from 'chai';
import * as sinon from 'sinon';
import WebSocketLink from '../src/webSocketLink';
import { SubscriptionClient } from 'subscriptions-transport-ws';
import { Observable } from 'apollo-link-core';
import { ExecutionResult } from 'graphql';

import { execute } from 'apollo-link-core';

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
    assert.doesNotThrow(() => new WebSocketLink(client));
  });

  // TODO some sort of dependency injection

  // it('should pass the correct initialization parameters to the Subscription Client', () => {
  // });

  it('should call request on the client for a query', done => {
    const result = { data: { data: 'result' } };
    const client: any = {};
    const observable = Observable.of(result);
    client.__proto__ = SubscriptionClient.prototype;
    client.request = sinon.stub().returns(observable);
    const link = new WebSocketLink(client);

    const obs = execute(link, { query });
    assert.deepEqual(obs, observable);
    obs.subscribe(data => {
      assert.equal(data, result);
      assert(client.request.calledOnce);
      done();
    });
  });

  it('should call query on the client for a mutation', done => {
    const result = { data: { data: 'result' } };
    const client: any = {};
    const observable = Observable.of(result);
    client.__proto__ = SubscriptionClient.prototype;
    client.request = sinon.stub().returns(observable);
    const link = new WebSocketLink(client);

    const obs = execute(link, { query: mutation });
    assert.deepEqual(obs, observable);
    obs.subscribe(data => {
      assert.equal(data, result);
      assert(client.request.calledOnce);
      done();
    });
  });

  it('should call request on the subscriptions client for subscription', done => {
    const result = { data: { data: 'result' } };
    const client: any = {};
    const observable = Observable.of(result);
    client.__proto__ = SubscriptionClient.prototype;
    client.request = sinon.stub().returns(observable);
    const link = new WebSocketLink(client);

    const obs = execute(link, { query: mutation });
    assert.deepEqual(obs, observable);
    obs.subscribe(data => {
      assert.equal(data, result);
      assert(client.request.calledOnce);
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
    client.request = sinon.stub().callsFake(() => {
      const copy = [...results];
      return new Observable<ExecutionResult>(observer => {
        observer.next(copy[0]);
        observer.next(copy[1]);
      });
    });

    const link = new WebSocketLink(client);

    execute(link, { query: subscription }).subscribe(data => {
      assert(client.request.calledOnce);
      assert.equal(data, results.shift());
      if (results.length === 0) {
        done();
      }
    });
  });
});
