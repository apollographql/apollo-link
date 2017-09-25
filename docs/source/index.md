---
title: Apollo Link
sidebar_title: Introduction
description: Apollo Link is a standard interface for modifying control flow of GraphQL requests and fetching GraphQL results.
---

This is the official guide for using Apollo Links in your Apollo app using the [apollo-link](https://github.com/apollographql/apollo-link) package. Apollo Link is a simple yet powerful way to describe how you want to execute a GraphQL operation, and what you want to do with the results. It is a convenient way to customize Apollo Client to the needs of your application while providing a small API to learn.

Follow the repository on GitHub: [Apollo Link](https://github.com/apollographql/apollo-link).

<h2 id="tutorials">Getting started</h2>

If you're familiar with web development, but haven't tried GraphQL or Apollo before, we've got you covered. Here's a set of small tutorials and examples you can look at, and in just a few hours you'll be well on your way to being an expert GraphQL developer! Or, you can jump right in to [installing the library](initialization.html).

<h3 id="usage-recipes">Usage and recipes (coming soon)</h3>

Once you've done the interactive examples and tutorials, you're ready to dive in deeper. We've tried to write this guide so that you can read it like a book and discover everything you can do with Apollo and GraphQL. In particular, check out the "Usage" section for basic functionality, and the "Recipes" section for specific directions about how to accomplish more advanced goals like error monitoring. If you run into anything, don't hesitate to ask a question on [Stack Overflow with the `apollo` tag](http://stackoverflow.com/questions/tagged/apollo), or on the [Apollo community Slack](http://dev.apollodata.com/#slack)!

<h2 id="compatibility">Compatible tools</h2>

The primary design point of Apollo Client is to work with the client or server tools you're already using. The maintainers and contributors focus on solving the hard problems around GraphQL caching, request management, and UI updating, and we want that to be available to anyone regardless of their technical requirements and preferences for other parts of the app.

<h3 id="graphql-servers">GraphQL servers</h3>

Because it doesn't assume anything beyond the official GraphQL specification, Apollo works with every GraphQL server implementation, for every language. It doesn't impose any requirements on your schema either; if you can send a query to a standard GraphQL server, Apollo can handle it. You can find a list of GraphQL server implementations on [graphql.org](http://graphql.org/code/#server-libraries).

<h2 id="goals">Project goals</h2>

Apollo Client is a JavaScript client for GraphQL. We built Apollo Client to be:

1. **Incrementally adoptable**, so that you can drop it into an existing JavaScript app and start using GraphQL for just part of your UI.
2. **Universally compatible**, so that Apollo works with any build setup, any GraphQL server, and any GraphQL schema.
2. **Simple to get started with**, you can just read a small tutorial and get going.
3. **Inspectable and understandable**, so that you can have great developer tools to understand exactly what is happening in your app.
4. **Built for interactive apps**, so your users can make changes and see them reflected in the UI immediately.
5. **Community driven**, so that you can be confident that the project will grow with your needs. Apollo packages are co-developed with production users from the start, and all projects are planned and developed in the open on GitHub so that there aren't any surprises.

Apollo Client does more than simply run your queries against your GraphQL server. It analyzes your queries and their results to construct a client-side cache of your data, which is kept up to date as further queries and mutations are run. This means that your UI can be internally consistent and fully up-to-date with the state on the server with the minimum number of queries required.

<h2 id="comparison">Other GraphQL clients</h2>

If you are deciding whether to use `apollo-link` or some other GraphQL client, it's worth considering the [goals](#goals) of the project, and how they compare. Here are some additional points:

 - [Relay](https://facebook.github.io/relay/) is a performance-oriented and highly opinionated GraphQL client built by Facebook for their mobile applications. It focuses on enabling the co-location of queries and components, and is opinionated about the design of your GraphQL schema, especially in the case of pagination. Apollo has an analogous set of features to Relay, but is designed to be a general-purpose tool that can be used with any schema or any frontend architecture. Relay's coupling to a specific architecture enables some benefits but with the loss of some flexibility, which also lets the Apollo community iterate more rapidly and quickly test experimental features.
 - [Lokka](https://github.com/kadirahq/lokka) is a simple GraphQL Javascript client with a basic query cache. Apollo is more complex, but includes a much more sophisticated cache and set of advanced features around updating and refetching data.

<h2 id="learn-more">Other resources</h2>

- [GraphQL.org](http://graphql.org) for an introduction and reference to the GraphQL itself, partially written and maintained by the Apollo team.
- [Our website](http://www.apollodata.com/) to learn about Apollo open source and commercial tools.
- [Our blog on Medium](https://medium.com/apollo-stack) for long-form articles about GraphQL, feature announcements for Apollo, and guest articles from the community.
- [Our Twitter](https://twitter.com/apollographql) for in-the-moment news.
