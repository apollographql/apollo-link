module.exports = {
  pathPrefix: '/docs/link',
  __experimentalThemes: [
    {
      resolve: 'gatsby-theme-apollo-docs',
      options: {
        root: __dirname,
        subtitle: 'Apollo Link',
        description: 'A guide to using Apollo Link to customize Apollo Client',
        githubRepo: 'apollographql/apollo-link',
        sidebarCategories: {
          null: [
            'index',
          ],
          Concepts: [
            'overview',
            'stateless',
            'stateful',
            'composition'
          ],
          Links: [
            'links/http',
            'links/state',
            'links/rest',
            'links/error',
            'links/context',
            'links/retry',
            'links/ws',
            'links/batch-http',
            'links/dedup',
            'links/schema',
            'links/community'
          ]
        },
      },
    },
  ],
};
