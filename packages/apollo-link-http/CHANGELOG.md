# Change log

### vNEXT

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
