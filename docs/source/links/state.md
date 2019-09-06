---
title: apollo-link-state
description: Manage your local data with Apollo Client
---

[**Read the announcement post!
🎉**](https://blog.apollographql.com/the-future-of-state-management-dd410864cae2) |
[**Video tutorial by Sara Vieira**](https://youtu.be/2RvRcnD8wHY) |
[**apollo-link-state on GitHub**](https://github.com/apollographql/apollo-link-state)


> ⚠️ As of Apollo Client 2.5, local state handling is baked into the core, which means it is no longer necessary to use `apollo-link-state`. For help with migrating from `apollo-link-state` to Apollo Client 2.5, please refer to the [migration guide](https://www.apollographql.com/docs/react/essentials/local-state/#migrating-from-apollo-link-state).

Managing remote data from an external API is simple with Apollo Client, but
where do we put all of our data that doesn't fit in that category? Nearly all
apps need some way to centralize client-side data from user interactions and
device APIs.

In the past, Apollo users stored their application's local data in a separate
Redux or MobX store. With `apollo-link-state`, you no longer have to maintain a
second store for local state. You can instead use the Apollo Client cache as
your single source of truth that holds all of your local data alongside your
remote data. To access or update your local state, you use GraphQL queries and
mutations just like you would for data from a server.

When you use Apollo Client to manage your local state, you get all of the same
benefits you know and love like caching and offline persistence without having
to set these features up yourself. 🎉 On top of that, you also benefit from the
[Apollo DevTools](https://github.com/apollographql/apollo-client-devtools) for
debugging and visibility into your store.

## Quick start

To get started, install `apollo-link-state` from npm:

```bash
npm install apollo-link-state --save
```

The rest of the instructions assume that you have already [set up Apollo
Client](https://www.apollographql.com/docs/react/basics/setup/#installation) in your application. After
you install the package, you can create your state link by calling
`withClientState` and passing in a resolver map. A resolver map describes how to
retrieve and update your local data.

Let's look at an example where we're using a GraphQL mutation to update whether
our network is connected with a boolean flag:

```js
import { withClientState } from 'apollo-link-state';

// This is the same cache you pass into new ApolloClient
const cache = new InMemoryCache(...);

const stateLink = withClientState({
  cache,
  resolvers: {
    Mutation: {
      updateNetworkStatus: (_, { isConnected }, { cache }) => {
        const data = {
          networkStatus: {
            __typename: 'NetworkStatus',
            isConnected
          },
        };
        cache.writeData({ data });
        return null;
      },
    },
  }
});
```

To hook up your state link to Apollo Client, add it to the other links in your
Apollo Link chain. Your state link should be near the end of the chain, so that
other links like `apollo-link-error` can also deal with local state requests.
However, it should go before `HttpLink` so local queries and mutations are
intercepted before they hit the network. It should also go before
[`apollo-link-persisted-queries`](https://github.com/apollographql/apollo-link-persisted-queries)
if you are using persisted queries. Then, pass your link chain to the Apollo
Client constructor.

```js
const client = new ApolloClient({
  cache,
  link: ApolloLink.from([stateLink, new HttpLink()]),
});
```

## With Apollo Boost

If you are using `apollo-boost`, it already includes `apollo-link-state` underneath the hood for you.
Instead of passing the `link` property when instantiating Apollo Client, you pass in `clientState`.

```js
import ApolloClient from 'apollo-boost';

const client = new ApolloClient({
  clientState: {
    defaults: {
      isConnected: true
    },
    resolvers: {
      Mutation: {
        updateNetworkStatus: (_, { isConnected }, { cache }) => {
          cache.writeData({ data: { isConnected }});
          return null;
        }
      }
    }
  }
});

```

How do we differentiate a request for local data from a request that hits our
server? In our query or mutation, we specify which fields are client-only with a
`@client` directive. This tells our network stack to retrieve or update the data
in the cache with our resolver map that we passed into our state link.

```js
const UPDATE_NETWORK_STATUS = gql`
  mutation updateNetworkStatus($isConnected: Boolean) {
    updateNetworkStatus(isConnected: $isConnected) @client
  }
`;
```

To fire off the mutation from your component, bind your mutation to your
component via your favorite Apollo view layer integration just like you normally
would. Here's what this would look like for React:

```js
const WrappedComponent = graphql(UPDATE_NETWORK_STATUS, {
  props: ({ mutate }) => ({
    updateNetworkStatus: isConnected => mutate({ variables: { isConnected } }),
  }),
})(NetworkStatus);
```

What if we want to access our network status data from another component? Since
we don't know whether our `UPDATE_NETWORK_STATUS` mutation will fire before we
try to access the data, we should guard against undefined values by providing a
default state as part of the state link initialization:

```js
const stateLink = withClientState({
  cache,
  resolvers: {
    Mutation: {
      /* same as above */
    },
  },
  defaults: {
    networkStatus: {
      __typename: 'NetworkStatus',
      isConnected: true,
    },
  },
});
```

This is the same as calling `writeData` yourself with an initial value:

```js
// Same as passing defaults above
cache.writeData({
  data: {
    networkStatus: {
      __typename: 'NetworkStatus',
     isConnected: true,
    },
  },
});
```

How do we query the `networkStatus` from our component? Similar to mutations,
just use a query and the `@client` directive! With Apollo Link, we can combine
data sources, including your remote data, in one query.

In this example, the `articles` field will either hit the cache or fetch from
our GraphQL endpoint, depending on our fetch policy. Since `networkStatus` is
marked with `@client`, we know that this is local data, so it will resolve from
the cache.

```js
const GET_ARTICLES = gql`
  query {
    networkStatus @client {
      isConnected
    }
    articles {
      id
      title
    }
  }
`;
```

To retrieve the data in your component, bind your query to your component via
your favorite Apollo view layer integration just like you normally would. In
this case, we'll use React as an example. React Apollo will attach both your
remote and local data to `props.data` while tracking both loading and error
states. Once the query returns a result, your component will update reactively.
Updates to Apollo Client state via `apollo-link-state` will also automatically
update any components using that data in a query.

```js
const WrappedComponent = graphql(GET_ARTICLES, {
  props: ({ data: { loading, error, networkStatus, articles } }) => {
    if (loading) {
      return { loading };
    }

    if (error) {
      return { error };
    }

    return {
      loading: false,
      networkStatus,
      articles,
    };
  },
})(Articles);
```

Now that you've seen how easy it is to manage your local state in Apollo Client,
let's dive deeper into how `apollo-link-state` updates and queries your local data with defaults and resolvers.

## Defaults

Often, you'll need to write an initial state to the cache so any components querying data before a mutation is triggered don't error out. To accomplish this, use the `defaults` property for the default values you'd like to write to the cache and pass in your cache to `withClientState`. Upon initialization, `apollo-link-state` will immediately write those values to the cache with `cache.writeData` before any operations have occurred.

The shape of your initial state should match how you plan to query it in your application.

```js
const defaults = {
  todos: [],
  visibilityFilter: 'SHOW_ALL',
  networkStatus: {
    __typename: 'NetworkStatus',
    isConnected: false,
  }
};

const resolvers = { /* ... */ };

const cache = new InMemoryCache();

const stateLink = withClientState({
  resolvers,
  cache,
  defaults
});
```

Sometimes you may need to [reset the store](https://www.apollographql.com/docs/react/features/cache-updates/#reset-store) in your application, for example when a user logs out. If you call `client.resetStore` anywhere in your application, you will need to write your defaults to the store again. `apollo-link-state` exposes a `writeDefaults` function for you. To register your callback to Apollo Client, call `client.onResetStore` and pass in `writeDefaults`.

```js
const cache = new InMemoryCache();
const stateLink = withClientState({ cache, resolvers, defaults });

const client = new ApolloClient({
  cache,
  link: stateLink,
});

const unsubscribe = client.onResetStore(stateLink.writeDefaults);
```

If you would like to unsubscribe this callback, `client.onResetStore` returns an unsubscribe function. However, we don't recommend calling unsubscribe on your state link's `writeDefaults` function unless you are planning on writing a new set of defaults to the cache.

## Resolvers

Your resolvers are where all the magic happens to retrieve and update your
local data in the Apollo cache. The resolver map is an object with resolver
functions for each GraphQL object type. You can think of a GraphQL query or
mutation as a tree of function calls for each field. These function calls
resolve to data or another function call.

The four most important things to keep in mind about resolvers in
`apollo-link-state` are this:

1. The cache is added to the context (the third argument to the resolver) for
   you so you can write and read data from the cache.
2. The resolver should return an object with a `__typename` property unless
   you've overridden the `dataIdFromObject` function to not use `__typename` for
   cache keys. This is necessary for Apollo Client to [normalize the data in the
   cache](https://www.apollographql.com/docs/react/basics/caching/#normalization) properly.
3. Resolver functions can return a promise if you need to perform asynchronous
   side effects.
4. Query resolvers are only called on a cache miss. Since the first time you
   call the query will be a cache miss, you should return any default state from
   your resolver function.

If any of that sounds confusing, I promise it will be cleared up by the end of
this section. Keep on reading! 😀

### Default resolvers

You don't have to specify resolver functions for every field, however. If the
return value from the parent object has the same property names as the fields
requested in the child object, you won't need to specify a resolver. This is
called a [default resolver](https://www.apollographql.com/docs/graphql-tools/resolvers/#Default-resolver).

```js
const getUser = gql`
  query {
    user(id: 1) @client {
      name {
        last
        first
      }
    }
  }
`;
```

For this query, you will need to specify a resolver for `Query.user` in your
resolver map. If `Query.user` returns an object with a name property that
corresponds to an object with last and first properties, you do not need to
specify any additional resolvers. GraphQL takes care of that for you!

### Resolver signature

The signature of a resolver function is the exact same as resolver functions on
the server built with `graphql-tools`. Let's quickly recap the four parameters
of a resolver function:

```js
fieldName: (obj, args, context, info) => result;
```

1. `obj`: The object containing the result returned from the resolver on the
   parent field or the `ROOT_QUERY` object in the case of a top-level query or
   mutation. Don't worry about this one too much for `apollo-link-state`.
2. `args`: An object containing all of the arguments passed into the field. For
   example, if you called a mutation with `updateNetworkStatus(isConnected:
   true)`, the `args` object would be `{ isConnected: true }`.
3. `context`: The context object, which is shared by all links in the Apollo
   Link chain. The most important thing to note here is that we've added the
   Apollo cache to the context for you, so you can manipulate the cache with
   `cache.writeData({})`. If you want to set additional values on the context,
   you can set them from [within your component](https://www.apollographql.com/docs/react/basics/queries.html#graphql-config-options-context) or by [using `apollo-link-context`](https://www.apollographql.com/docs/link/links/context.html).
4. `info`: Information about the execution state of the query. You will probably
   never have to use this one.

For further exploration, check out the [`graphql-tools` docs](https://www.apollographql.com/docs/graphql-tools/resolvers.html#Resolver-function-signature).

### Async resolvers

`apollo-link-state` supports asynchronous resolver functions. These functions
can either be `async` functions or ordinary functions that return a Promise.
This can be useful for performing side effects like accessing a device API. If
you would like to hit a REST endpoint with your resolver, [we recommend checking
out `apollo-link-rest`](https://github.com/apollographql/apollo-link-rest)
instead, which is a more complete solution for using your REST endpoints with
Apollo Client.

For React Native and most browser APIs, you should set up a listener in a
component lifecycle method and pass in your mutation trigger function as the
callback instead of using an async resolver. However, there are some cases where
it's beneficial to perform the side effect within a resolver:

```js
import { CameraRoll } from 'react-native';

const cameraRoll = {
  Query: {
    cameraRoll: async (_, { assetType }) => {
      try {
        const media = await CameraRoll.getPhotos({
          first: 20,
          assetType,
        });

        return {
          ...media,
          id: assetType,
          __typename: 'CameraRoll',
        };
      } catch (e) {
        console.error(e);
        return null;
      }
    },
  },
};
```

[`CameraRoll.getPhotos()`](https://facebook.github.io/react-native/docs/cameraroll.html#getphotos)
returns a Promise resolving to an object with a `edges` property, which is an
array of camera node objects, and a `page_info` property, which is an object
with pagination information. This is a great use case for GraphQL, since we can
filter down the return value to only the data that our components consume.

```js
const GET_PHOTOS = gql`
  query getPhotos($assetType: String!) {
    cameraRoll(assetType: $assetType) @client {
      id
      edges {
        node {
          image {
            uri
          }
          location {
            latitude
            longitude
          }
        }
      }
    }
  }
`;
```

### Organizing your resolvers

For most applications, your map of resolvers will probably be too large to fit in
one file. To organize your resolver map, we recommend splitting it up by
feature, similar to the Redux [ducks
pattern](https://github.com/erikras/ducks-modular-redux). Each feature will have
its own set of queries, mutations, and fields on its resolver map. Then, you can
merge all of your separate resolver maps into one object before you pass it to
`withClientState`.

```js
import merge from 'lodash.merge';
import { withClientState } from 'apollo-link-state';

import currentUser from './resolvers/user';
import cameraRoll from './resolvers/camera';
import networkStatus from './resolvers/network';

const stateLink = withClientState({
  cache,
  resolvers: merge(currentUser, cameraRoll, networkStatus),
});
```

You can do the same thing with the `defaults` option as well:

```js
const currentUser = {
  defaults: {
    currentUser: null,
  },
  resolvers: { ... }
};

const cameraRoll = { defaults: { ... }, resolvers: { ... }};

const stateLink = withClientState({
  ...merge(currentUser, cameraRoll, networkStatus),
  cache,
});
```

## Updating the cache

When you manage your local data with Apollo Client, your Apollo cache becomes
the single source of truth for all your local and remote data. To update and
read from the cache, you access it via the `context`, which is the third
argument passed to your resolver function.

The [Apollo cache API](https://www.apollographql.com/docs/react/features/caching.html) has several methods to assist you with updating and retrieving data. Let's walk through each of the methods and some common use cases for each one!

### writeData

The easiest way to update the cache is with `cache.writeData`, which allows you
to write data directly to the cache without passing in a query. Here's how
you use it in your resolver map for a simple update:

```js
const filter = {
  Mutation: {
    updateVisibilityFilter: (_, { visibilityFilter }, { cache }) => {
      const data = { visibilityFilter, __typename: 'Filter' };
      cache.writeData({ data });
    },
  },
};
```

`cache.writeData` also allows you to pass in an optional `id` property to write
a fragment to an existing object in the cache. This is useful if you want to add
some client-side fields to an existing object in the cache.

The `id` should correspond to the object's cache key. If you're using the
`InMemoryCache` and not overriding the `dataObjectFromId` config property, your
cache key should be `__typename:id`.

```js
const user = {
  Mutation: {
    updateUserEmail: (_, { id, email }, { cache }) => {
      const data = { email };
      cache.writeData({ id: `User:${id}`, data });
    },
  },
};
```

`cache.writeData` should cover most of your needs; however, there are some cases
where the data you're writing to the cache depends on the data that's already
there. In that scenario, you should use `readQuery` or `readFragment`, which
allows you to pass in a query or a fragment to read data from the cache. If you'd like to validate the shape of your data that you're writing to the cache, use `writeQuery` or `writeFragment`. We'll explain some of those use
cases below.

### writeQuery and readQuery

Sometimes, the data you're writing to the cache depends on data that's already
in the cache; for example, you're adding an item to a list or setting a property
based on an existing property value. In that case, you should use
`cache.readQuery` to pass in a query and read a value from the cache before you
write any data. Let's look at an example where we add a todo to a list:

```js
let nextTodoId = 0;

const todos = {
  defaults: {
    todos: [],
  },
  resolvers: {
    Mutation: {
      addTodo: (_, { text }, { cache }) => {
        const query = gql`
          query GetTodos {
            todos @client {
              id
              text
              completed
            }
          }
        `;

        const previous = cache.readQuery({ query });
        const newTodo = { id: nextTodoId++, text, completed: false, __typename: 'TodoItem' };
        const data = {
          todos: previous.todos.concat([newTodo]),
        };

        // you can also do cache.writeData({ data }) here if you prefer
        cache.writeQuery({ query, data });
        return newTodo;
      },
    },
  },
};
```

In order to add our todo to the list, we need the todos that are currently in
the cache, which is why we call `cache.readQuery` to retrieve them.
`cache.readQuery` will throw an error if the data isn't in the cache, so we need
to provide an initial state. This is why we're returning an empty array in our
`Query.todos` resolver.

To write the data to the cache, you can use either `cache.writeQuery` or
`cache.writeData`. The only difference between the two is that
`cache.writeQuery` requires that you pass in a query to validate that the shape
of the data you're writing to the cache is the same as the shape of the data
required by the query. Under the hood, `cache.writeData` automatically
constructs a query from the `data` object you pass in and calls
`cache.writeQuery`.

### writeFragment and readFragment

`cache.readFragment` is similar to `cache.readQuery` except you pass in a
fragment. This allows for greater flexibility because you can read from any
entry in the cache as long as you have its cache key. In contrast,
`cache.readQuery` only lets you read from the root of your cache.

Let's go back to our previous todo list example and see how `cache.readFragment`
can help us toggle one of our todos as completed.

```js
const todos = {
  resolvers: {
    Mutation: {
      toggleTodo: (_, variables, { cache }) => {
        const id = `TodoItem:${variables.id}`;
        const fragment = gql`
          fragment completeTodo on TodoItem {
            completed
          }
        `;
        const todo = cache.readFragment({ fragment, id });
        const data = { ...todo, completed: !todo.completed };

        // you can also do cache.writeData({ data, id }) here if you prefer
        cache.writeFragment({ fragment, id, data });
        return null;
      },
    },
  },
};
```

In order to toggle our todo, we need the todo and its status from the cache,
which is why we call `cache.readFragment` and pass in a fragment to retrieve it.
The `id` we're passing into `cache.readFragment` refers to its cache key. If
you're using the `InMemoryCache` and not overriding the `dataObjectFromId`
config property, your cache key should be `__typename:id`.

To write the data to the cache, you can use either `cache.writeFragment` or
`cache.writeData`. The only difference between the two is that
`cache.writeFragment` requires that you pass in a fragment to validate that the
shape of the data you're writing to the cache node is the same as the shape of
the data required by the fragment. Under the hood, `cache.writeData`
automatically constructs a fragment from the `data` object and `id` you pass in
and calls `cache.writeFragment`.

## @client directive

Adding the `@client` directive to a field is how Apollo Link knows to resolve
your data from the Apollo cache instead of making a network request. This
approach is similar to other Apollo Link APIs, such as
[`apollo-link-rest`](https://github.com/apollographql/apollo-link-rest), which
uses the `@rest` directive to specify fields that should be fetched from a REST
endpoint. To clarify, the `@client` and `@rest` directives never modify the
shape of the result; rather, they specify where the data is coming from.

### Combining local and remote data

What's really cool about using a `@client` directive to specify client-side only
fields is that you can actually combine local and remote data in one query. In
this example, we're querying our user's name from our GraphQL server and their
cart from our Apollo cache. Both the local and remote data will be merged
together in one result.

```js
const getUser = gql`
  query getUser($id: String) {
    user(id: $id) {
      id
      name
      cart @client {
        product {
          name
          id
        }
      }
    }
  }
`;
```

Thanks to the power of directives and Apollo Link, you'll soon be able to
request `@client` data, `@rest` data, and data from your GraphQL server all in
one query! 🎉

## Example apps

To get you started, here are some example apps:

* [Todo](https://github.com/apollographql/apollo-link-state/tree/master/examples/todo):
  The classic todo list example
* [Async](https://github.com/apollographql/apollo-link-state/tree/master/examples/async):
  Uses a React Native Web device API with async resolvers

If you have an example app that you'd like to be featured, please send us a PR!
😊 We'd love to hear how you're using `apollo-link-state`.

## Roadmap

While `apollo-link-state` is ready to use in your Apollo application today,
there are a few enhancements we're looking to implement soon before a v1.0
release.

We want your experience managing local data in Apollo Client to be as seamless
as possible, so please get in touch if there's a feature you're looking for
that's not on this list. Additionally, if any of these topics interest you, we'd
love to have you on board as a contributor!

### Type checking

You may have noticed we haven't mentioned a client-side schema yet or any type
validation. That's because we haven't settled on how to approach this piece of
the puzzle yet. It is something we would like to tackle soon in order to enable
schema introspection and autocomplete with GraphiQL in Apollo DevTools, as well
as code generation with `apollo-codegen`.

Having the same runtime type checking as a GraphQL server does is problematic
because the necessary modules from `graphql-js` are very large. Including the
modules for defining a schema and validating a request against a schema would
significantly increase bundle size, so we'd like to avoid this approach. This is
why we don't send your server's entire schema over to Apollo Client.

Ideally, we'd like to perform type checking at build time to avoid increasing
bundle size. This is comparable to the rest of the JavaScript ecosystem---for
example, Flow and TypeScript types are both stripped out at build time.

We don't consider this a blocker for using `apollo-link-state`, but it is a
feature we'd like to build before the v1.0 release. If you have any ideas on how
to achieve this, please open up an issue for discussion on the
`apollo-link-state` repo.

### Helper components

Our goal for `apollo-link-state` is to make your experience managing local data
in Apollo Client as seamless as possible. To accomplish this, we want to
minimize boilerplate as much as possible so you can be productive quickly.

We're nearly there; for example, `cache.writeData` was added as a helper method
to reduce the boilerplate of `cache.writeQuery` and `cache.writeFragment`. We
think we can improve the boilerplate required for binding your query or mutation
to a component. For example, this is a common pattern for performing a
client-side mutation:

```js
const WrappedComponent = graphql(
  gql`
    mutation updateStatus($text: String) {
      status(text: $text) @client
    }
  `,
)(({ mutate }) => (
  <button onClick={() => mutate({ variables: { text: 'yo' } })} />
));
```

What if we could shorten it to something like this, so you don't have to write
out the mutation details yourself, but it's still implemented as a mutation
under the hood?

```js
withClientMutations(({ writeField }) => (
  <button onClick={() => writeField({ status: 'yo' })} />
));
```

Once we find out how people are using `apollo-link-state`, we can start to write
helper components for making common mutation and query patterns even easier.
These components will be separate from React Apollo and will live in another
package in the `apollo-link-state` repo. If you'd like to help build them,
please get in touch!
