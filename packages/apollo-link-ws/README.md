---
title: apollo-link-ws
description: Send GraphQL operations over a WebSocket. Works with GraphQL Subscriptions.
---

This link is particularly useful to use GraphQL Subscriptions, but it will also allow you to send GraphQL queries and mutations over WebSockets as well.

You can choose to send all connections (query, mutation, subscription) over a websocket, or you can choose a hybrid approach and send subscriptions via websocket and queries/mutations via http.

<h3 id="everythingoverwebsocket">Everything Over Websocket</h3>

```js
import { WebSocketLink } from "apollo-link-ws";
import { SubscriptionClient } from "subscriptions-transport-ws";

const GRAPHQL_WS_ENDPOINT = "ws://localhost:3000/graphql";

const link = new WebSocketLink(
  new SubscriptionClient(GRAPHQL_WS_ENDPOINT, {
    reconnect: true
  })
);
```

<h3 id="hybridwebsocketandhttp">Hybrid Websocket and HTTP</h3>

```js
import { WebSocketLink } from "apollo-link-ws";
import { SubscriptionClient } from "subscriptions-transport-ws";
import { getOperationAST } from 'graphql';
import { createHttpLink } from "apollo-link-http";

const GRAPHQL_WS_ENDPOINT = "ws://localhost:3000/graphql";

const wsLink = new WebSocketLink(
  new SubscriptionClient(GRAPHQL_WS_ENDPOINT, {
    reconnect: true
  })
);

const httpLink = createHttpLink({ uri: "/graphql" });

const link = ApolloLink.split(
  operation => {
    const operationAST = getOperationAST(
      operation.query,
      operation.operationName,
    );
    
    return !!operationAST && operationAST.operation === 'subscription';
  },
  wsLink,
  httpLink,
);
```

## Options

WS Link takes either a subscription client or an object with three options on it to customize the behavior of the link. Takes the following possible keys in the configuration object:

* `uri`: a string endpoint to connect to
* `options`: a set of options to pass to a new Subscription Client
* `webSocketImpl`: a custom WebSocket implementation

By default, this link uses the [subscriptions-transport-ws](https://github.com/apollographql/subscriptions-transport-ws) library for the transport.
