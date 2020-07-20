# apollo-link [![npm version](https://badge.fury.io/js/apollo-link.svg)](https://badge.fury.io/js/apollo-link) [![Get on Slack](https://img.shields.io/badge/slack-join-orange.svg)](http://www.apollostack.com/#slack)

---

⚠️ **THIS PROJECT HAS BEEN DEPRECATED** ⚠️
 
The Links in this repo have been migrated to the [apollo-client](https://github.com/apollographql/apollo-client.git) project (as of >= `@apollo/client@3.0.0`). Please refer to the [Apollo Client migration guide](https://www.apollographql.com/docs/react/migrating/apollo-client-3-migration/) for more details. All Apollo Link issues / pull requests should now be opened in the [apollo-client](https://github.com/apollographql/apollo-client.git) repo.

---

`apollo-link` is a standard interface for modifying control flow of GraphQL requests and fetching GraphQL results, designed to provide a simple GraphQL client that is capable of extensions.
The high level use cases of `apollo-link` are highlighted below:

* fetch queries directly without normalized cache
* network interface for Apollo Client
* network interface for Relay Modern
* fetcher for GraphiQL

The apollo link interface is designed to make links composable and easy to share, each with a single purpose. In addition to the core, this repository contains links for the most common fetch methods—http, local schema, websocket—and common control flow manipulations, such as retrying and polling. For a more detailed view of extended use cases, please see this [list](http://www.apollographql.com/docs/link/links/community.html) of community created links.

## Installation

`npm install apollo-link --save`

To use apollo-link in a web browser or mobile app, you'll need a build system capable of loading NPM packages on the client.
Some common choices include Browserify, Webpack, and Meteor +1.3.

## [Documentation](http://www.apollographql.com/docs/link/index.html)

To start, begin by reading this [introduction](https://www.apollographql.com/docs/link/index.html). For a deeper understanding and to fully leverage the power of Apollo Links, please view the [concepts overview](https://www.apollographql.com/docs/link/overview.html). To see example links from around the community, check out this [list](http://www.apollographql.com/docs/link/links/community.html). If you would like your link to be featured, please open a pull request.

## Contributing

Apollo Link uses Lerna to manage multiple packages. To get started contributing, run `npm run bootstrap` in the root of the repository, which will install all dependencies and connect the dependent projects with symlinks in `node_modules`. Then run `npm run build` to compile the typescript source. Finally for incremental compilation, use `npm run watch`.

Your feedback and contributions are always welcome.

## Apollo Principles

`apollo-link` strives to follow the Apollo design principles:

1. Incrementally adoptable
2. Universally compatible
2. Simple to get started with
3. Inspectable and understandable
4. Built for interactive apps
4. Small and flexible
5. Community driven

## Maintainers

- [@hwillson](https://github.com/hwillson) (Apollo)
- [@benjamn](https://github.com/benjamn) (Apollo)
