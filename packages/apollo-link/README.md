# apollo-link

## Purpose

`apollo-link` is a standard interface for modifying control flow of GraphQL requests and fetching GraphQL results, designed to provide a simple GraphQL client that is capable of extensions.
The targeted use cases of `apollo-link` are highlighted below:

* fetch queries directly without normalized cache
* network interface for Apollo Client
* network interface for Relay Modern
* fetcher for

Apollo Link is the interface for creating new links in your application.

## Installation

`npm install apollo-link --save`

To use this package in a web browser or mobile app, you'll need a build system capable of loading NPM packages on the client.
Some common choices include Browserify, Webpack, and Meteor +1.3.
