/// <reference path="../node_modules/infuse.js/typescript/infusejs.d.ts"/>

import { assert } from 'chai';
import * as sinon from 'sinon';
import WebSocketLink from '../src/webSocketLink';
import {
  SubscriptionClient,
  OperationOptions,
} from 'subscriptions-transport-ws';
import { Observable } from 'apollo-link-core';
import { ExecutionResult } from 'graphql';

// import * as infuse from 'infuse.js';
// class MockSubscriptionClient {

//   public constructorStub = sinon.spy();
//   public subscribeStub = sinon.spy();
//   public queryStub = sinon.spy();

//   constructor(uri: string, options?: ClientOptions, webSocketImpl?: any) {
//     this.constructorStub(uri, options, webSocketImpl);
//   }

//   public subscribe(operation, callback) {
//     return this.subscribeStub(operation, callback);
//   }

//   public query(operation) {
//     return this.queryStub(operation);
//   }
// }

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
  //   const injector = new infuse.Injector();
  //   const webSocketImpl = <any>{some: 'impl'};
  //   const options = <any>{some: 'options'};
  //   injector.mapValue('SubscriptionClient', MockSubscriptionClient);
  //   if (injector.hasMapping('paramsOrClient')) {
  //     injector.removeMapping('paramsOrClient');
  //   }
  //   injector.mapValue('paramsOrClient', {
  //     uri: wsURI,
  //     options,
  //     webSocketImpl,
  //   });
  //   const link = injector.createInstance(WebSocketLink);

  //   assert(link.constructorStub.calledOnce);
  //   assert(link.constructorStub.called);
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
      assert(client.query.calledOnce);
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
      assert(client.query.calledOnce);
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
      assert(client.query.calledOnce);
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
    client.subscribe = sinon.stub().callsFake(() => {
      const copy = [...results];
      return new Observable<ExecutionResult>(observer => {
        observer.next(copy[0]);
        observer.next(copy[1]);
      });
    });

    const link = new WebSocketLink(client);

    execute(link, { query: subscription }).subscribe(data => {
      assert(client.subscribe.calledOnce);
      assert.equal(data.data, results.shift());
      if (results.length === 0) {
        done();
      }
    });
  });
});
