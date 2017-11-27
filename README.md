# apollo-link [![npm version](https://badge.fury.io/js/apollo-link.svg)](https://badge.fury.io/js/apollo-link) [![Get on Slack](https://img.shields.io/badge/slack-join-orange.svg)](http://www.apollostack.com/#slack)

`apollo-link` is a standard interface for modifying control flow of GraphQL requests and fetching GraphQL results, designed to provide a simple GraphQL client that is capable of extensions.
The targeted use cases of `apollo-link` are highlighted below:

* fetch queries directly without normalized cache
* network interface for Apollo Client
* network interface for Relay Modern
* fetcher for GraphiQL

## Installation

`npm install apollo-link --save`

To use apollo-link in a web browser or mobile app, you'll need a build system capable of loading NPM packages on the client.
Some common choices include Browserify, Webpack, and Meteor +1.3.


## Contributing
Apollo Link uses Lerna to manage multiple packages. To get started contributing, run `npm run bootstrap` which will install all dependencies and connect the dependent projects with symlinks `node_modules`.

## Documentation

To start, begin by reading the getting started [guide](http://apollo-link-docs.netlify.com/docs/link/index.html).

If you are interested in implementing your own links, read the implementation [information](http://apollo-link-docs.netlify.com/docs/link/overview.html).

Your feedback and contributions are welcome.

## Apollo Principles

`apollo-link` strives to follow the Apollo design principles:

1. Incrementally adoptable
2. Universally compatible
2. Simple to get started with
3. Inspectable and understandable
4. Built for interactive apps
4. Small and flexible
5. Community driven
