# Change log

### vNEXT
- apollo-link-http: Added clarity around errors: ClientParseError, ServerParseError, and ServerError(Network and Missing Data)
- apollo-link-error: graphQLErrors alias networkError.result.errors on a networkError

### 1.0.1
- moved to better rollup build

### 1.0.0
- Added the operation and any data to the error handler callback
- changed graphqlErrors to be graphQLErrors to be consistent with Apollo Client
