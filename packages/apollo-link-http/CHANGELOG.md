# Change log

### vNEXT

### 1.3.2

- Update to graphql@0.12

### 1.3.1
- export options as named interface [TypeScript]
- Fix typescript bug with destructuring of parameter in createHttpLink (#189)

### 1.3.0
- changed to initially parsing response as text to improve error handling
- cleaned up error handling types and added docs
- changed peer-dependency of apollo-link to actual dependency

### 1.2.0
- moved to better rollup build
- support for persisted queries by opting out of sending the query

### v1.1.0
- support dynamic endpoints using `uri` on the context
- the request not attaches the raw response as `response` on the context. This can be used to access response headers or more

### v1.0.0
- official release, not changes

### v0.9.0
- changed `fetcherOptions` to be `fetchOptions` and added a test for using 'GET' requests

### v0.8.0
- throw error on empty ExectionResult (missing)
- support setting credentials, headers, and fetcherOptions in the setup of the link
- removed sending of context to the server and allowed opt-in of sending extensions
