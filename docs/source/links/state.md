---
title: apollo-link-state
description: Manage your local data with Apollo Client
---

Managing remote data from an external API is simple with Apollo Client, but
where do we put all of our data that doesn't fit in that category? Nearly all
apps need to centralize client-side data from user interactions and device APIs
somewhere!

In the past, Apollo users stored their application's local data in a separate
Redux or MobX store. With `apollo-link-state`, you no longer have to maintain a
second store for local state. Your Apollo Client cache is your single source of
truth that holds all of your local data alongside your remote data. To access or
update your local state, you use GraphQL queries & mutations just like you would
for data from a server.

When you use Apollo Client to manage your local state, you get all of the same
benefits you know and love like caching, optimistic UI, and persistence without
having to set these features up yourself. 🎉 On top of that, you also benefit
from the excellent developer experience of Apollo DevTools for painless
debugging & full visibility into your store.

<h2 id="start">Quick start</h2>

To get started, install `apollo-link-state` from npm:

```bash
npm install apollo-link-state --save
```

The rest of the instructions assume that you already [set up Apollo
Client](/docs/react/basics/setup.html#installation) in your application. After
you install the package, you can create your state link by calling
`withClientState` and passing in a resolver map. A resolver map describes how to
retrieve and update your local data.

Let's look at an example where we're using a GraphQL mutation to update whether
our network is connected with a boolean flag:

```js
import { withClientState } from 'apollo-link-state';

const stateLink = withClientState({
  Mutation: {
    networkStatus: (_, { isConnected }, { cache }) => {
      const data = {
        networkStatus: { isConnected, __typename: 'NetworkStatus' },
      };
      cache.writeData({ data });
      return data;
    },
  },
});
```

To hook up your state link to Apollo Client, concatenate it to the other links
in your Apollo Link chain. Your state link should be one of the last links in
your chain. Then, pass your link chain to the Apollo Client constructor.

```js
const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: stateLink.concat(new HttpLink()),
});
```

How do we differentiate a request for local data from a request that hits our
server? In our query or mutation, we specify which fields are client-only with a
`@client` directive. This tells our network stack to retrieve or update the data
in the cache with our resolver map that we passed into our state link.

```js
const UPDATE_NETWORK_STATUS = gql`
  mutation updateNetworkStatus($isConnected: Boolean) {
    networkStatus(isConnected: $isConnected) @client {
      isConnected
    }
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

Now that you've seen how easy it is to update local state with
`apollo-link-state`, let's dive deeper into the resolver map.

<h2 id="resolver">Resolver map</h2>

Your resolver map is where all the magic happens to retrieve and update your
local data in the Apollo cache. The resolver map is an object with resolver
functions for each GraphQL object type. You can think of a GraphQL query or
mutation as a tree of function calls for each field.

Each field must either resolve to a GraphQL primitive (Int, String, etc) or
resolve in a function call. You don't have to specify resolver functions for
every field, however. GraphQL has [default
resolvers](docs/graphql-tools/resolvers.html#Default-resolver). If the return
value from the parent object has the same property names as the fields requested
in the child object, you won't need to specify a resolver.

```js
const getUser = gql`
  query {
    user(id: 1) {
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

The three most important things to keep in mind about resolvers in
`apollo-link-state` are this:

1. The cache is added to the context for you so you can write & read data from
   the cache.
2. The resolver should return an object with a `__typename` property. This is
   necessary for Apollo Client to [normalize the data in the
   cache](/docs/react/basics/caching.html#normalization) properly.
3. Resolver functions can be asynchronous if you need to perform side effects.

If any of that sounds confusing, I promise it will be cleared up by the end of
this section. Keep on reading! 😀

<h3 id="async">Resolver signature</h3>

The signature of a resolver function is the exact same as resolver functions on
the server built with `graphql-tools`. Let's quickly recap the four parameters
of a resolver function:

```js
fieldName(obj, args, context, info) => result
```

1. `obj`: The object containing the result returned from the resolver on the
   parent field or the `ROOT_QUERY` object in the case of a top-level query or
   mutation. Don't worry about this one - you probably won't need to use it for
   `apollo-link-state`.
2. `args`: An object containing all of the arguments passed into the field. For
   example, if you called the field with `networkStatus(isConnected: true)`, the
   `args` object would be `{ isConnected: true }`.
3. `context`: The context object, which is shared by all links in the Apollo
   Link chain. The most important thing to note here is that we've added the
   Apollo cache to the context for you, so you can manipulate the cache with
   `cache.writeData({})`. If you want to set additional values on the context,
   you can set them from [within your
   component](docs/react/basics/queries.html#graphql-config-options-context) or
   by [using `apollo-link-context`](/docs/link/links/context.html).
4. `info`: Information about the execution state of the query. You will probably
   never have to use this one.

For further exploration, check out the [`graphql-tools`
docs](/docs/graphql-tools/resolvers.html#Resolver-function-signature).

<h3 id="async">Async resolvers</h3>

`apollo-link-state` supports asynchronous resolver functions. This can be useful
for performing side effects like accessing a device API. If you would like to
hit a REST endpoint with your resolver, [we recommend checking out
`apollo-link-rest`](https://github.com/apollographql/apollo-link-rest) instead,
which is a more complete solution for using your REST endpoints with Apollo
Client.

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
    cameraRoll(assetType: $assetType) {
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

<h3 id="organize">Organizing resolver maps</h3>

For most applications, your resolver map will probably be too large to fit in
one file. To organize your resolver map, we recommend splitting it up by
feature, similar to the Redux [ducks
pattern](https://github.com/erikras/ducks-modular-redux). Each feature will have
its own set of queries, mutations, and fields on its resolver map. Then, you can
merge all of your separate resolver maps into one object before you pass it to
`withClientState`.

```js
import { merge } from 'lodash';
import { withClientState } from 'apollo-link-state';

import currentUser from './resolvers/user';
import cameraRoll from './resolvers/camera';
import networkStatus from './resolvers/camera';

const stateLink = withClientState(
  merge({}, currentUser, cameraRoll, networkStatus),
);
```

<h2 id="cache">Updating the cache</h2>

<h3 id="write-data">writeData</h3>

<h3 id="write-query">writeQuery & readQuery</h3>

<h3 id="write-fragment">writeFragment & readFragment</h3>

<h2 id="directive">@client directive</h2>

<h3 id="combine">Combining local & remote data</h3>

<h2 id="examples">Example apps</h2>

To get you started, here are some example apps:

* Todo: The classic Redux todo list example
* Async: Uses a React Native Web device API with async resolvers

<h2 id="roadmap">Roadmap</h2>

While `apollo-link-state` is ready to use in your Apollo application today,
there are a few enhancements we're looking to implement soon before a v1.0
release.

We want your experience managing local data in Apollo Client to be as seamless
as possible, so please get in touch if there's a feature you're looking for
that's not on this list. Additionally, if any of these topics interest you, we'd
love to have you on board as a contributor!

<h3 id="type-checking">Type checking</h3>

<h3 id="helper-components">Helper components</h3>
