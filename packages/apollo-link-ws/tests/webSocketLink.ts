/// <reference path="../node_modules/infuse.js/typescript/infusejs.d.ts"/>

import { assert } from 'chai';
import * as sinon from 'sinon';
import WebSocketLink from '../src/webSocketLink';
import {
  SubscriptionClient,
  OperationOptions,
} from 'subscriptions-transport-ws';

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

const subscripiton = `
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

  it('should call query on the client for a query', done => {
    const result = { data: { data: 'result' } };
    const client: any = {};
    client.__proto__ = SubscriptionClient.prototype;
    client.query = sinon
      .stub()
      .returns(new Promise(resolve => resolve(result)));
    const link = new WebSocketLink(client);

    execute(link, { query }).subscribe(data => {
      assert.equal(data, result);
      assert(client.query.calledOnce);
      done();
    });
  });

  it("should call Observable's error when query promise fails", () => {
    const error = new Error('message');
    const client: any = {};
    client.__proto__ = SubscriptionClient.prototype;
    client.query = sinon
      .stub()
      .returns(new Promise((resolve, reject) => reject(error)));
    const link = new WebSocketLink(client);

    return new Promise((resolve, reject) => {
      execute(link, { query }).subscribe({
        next: reject,
        error: err => {
          assert.equal(err, error);
          assert(client.query.calledOnce);
          resolve();
        },
        complete: reject,
      });
    });
  });

  it('should call query on the client for a mutation', done => {
    const result = { data: { data: 'result' } };
    const client: any = {};
    client.__proto__ = SubscriptionClient.prototype;
    client.query = sinon
      .stub()
      .returns(new Promise(resolve => resolve(result)));
    const link = new WebSocketLink(client);

    execute(link, { query: mutation }).subscribe(data => {
      assert.equal(data, result);
      assert(client.query.calledOnce);
      done();
    });
  });

  it('should call subscribe on the subscriptions client', done => {
    const result = { data: { data: 'result' } };
    const client: any = {};
    client.__proto__ = SubscriptionClient.prototype;
    client.subscribe = sinon
      .stub()
      .callsFake(
        (
          operation: OperationOptions,
          handle: (error: Error[], result?: any) => void,
        ) => {
          setTimeout(() => handle([], result), 1);
          return 'id';
        },
      );

    const link = new WebSocketLink(client);

    execute(link, { query: subscripiton }).subscribe(data => {
      assert.equal(data.data, result);
      assert(client.subscribe.calledOnce);
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
    client.subscribe = sinon
      .stub()
      .callsFake(
        (
          operation: OperationOptions,
          handle: (error: Error[], result?: any) => void,
        ) => {
          const copy = [...results];
          setTimeout(() => {
            handle([], copy[0]);
            setTimeout(() => handle([], copy[1]), 1);
          }, 1);
          return 'id';
        },
      );

    const link = new WebSocketLink(client);

    execute(link, { query: subscripiton }).subscribe(data => {
      assert(client.subscribe.calledOnce);
      assert.equal(data.data, results.shift());
      if (results.length === 0) {
        done();
      }
    });
  });

  it('should call unsubscribe on the client with the correct id', done => {
    const client: any = {};
    client.__proto__ = SubscriptionClient.prototype;
    client.subscribe = sinon.stub().returns('id');

    client.unsubscribe = sinon.stub().callsFake((id: string) => {
      assert(client.subscribe.calledOnce);
      assert.equal(id, 'id');
      done();
    });

    const link = new WebSocketLink(client);

    execute(link, { query: subscripiton }).subscribe({}).unsubscribe();
  });
});
