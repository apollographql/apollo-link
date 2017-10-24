---
title: WebSocket Link
---

## Purpose
An Apollo Link to allow sending a request over a web socket.

## Installation

`npm install apollo-link-ws --save`

## Usage
```js
import { WebSocketLink } from "apollo-link-ws";
import { SubscriptionClient } from 'subscriptions-transport-ws';

const GRAPHQL_ENDPOINT = 'ws://localhost:3000/graphql';

const client = new SubscriptionClient(GRAPHQL_ENDPOINT, {
  reconnect: true,
});

const link = new WebSocketLink(client);
```

## Options
WS Link takes either a subscription client or an object with three options on it to customize the behavior of the link. Takes the following possible keys in the configuration object:

- `uri`: a string endpoint to connect to
- `options`: a set of options to pass to a new Subscription Client
- `webSocketImpl`: a custom WebSocket implementation

By default, this link uses the [subscriptions-transport-ws](https://github.com/apollographql/subscriptions-transport-ws) library for the transport.

## Context
The WS Link does not use any keys on the context.
