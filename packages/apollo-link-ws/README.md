# WebSocket Link

## Purpose
An Apollo Link to allow sending a request over a web socket.

## Installation

`npm install apollo-link-ws --save`

To use this package in a web browser or mobile app, you'll need a build system capable of loading NPM packages on the client.
Some common choices include Browserify, Webpack, and Meteor +1.3.

## Usage
```js
import WSLink from "apollo-link-ws";
import { SubscriptionClient } from 'subscriptions-transport-ws';

const GRAPHQL_ENDPOINT = 'ws://localhost:3000/graphql';

const client = new SubscriptionClient(GRAPHQL_ENDPOINT, {
  reconnect: true,
});

const link = new WSLink(client);
```

## Options
WS Link takes either a subscription client or an object with three options on it to customize the behavoir of the link.

uri: string;
  options?: ClientOptions;
  webSocketImpl?: any;

|name|value|default|required|
|---|---|---|---|
|uri|string|NA|false|
|options|Subscription ClientOptions|NA|false|
|webSocketImpl|WebSocket implementation|NA|false|

By default, this link uses the [subscriptions-transport-ws](https://github.com/apollographql/subscriptions-transport-ws) library for the transport.

## Context
The WS Link does not use any keys on the context.
