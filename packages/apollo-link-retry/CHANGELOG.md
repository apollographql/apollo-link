# Change log

### vNext

### 2.2.1
- Fix a bug where `observer` is null during onComplete, onNext, onError [#528](https://github.com/apollographql/apollo-link/pull/528)

### 2.2.0
- handle Promises from `retryIf` and `attempts` [#436](https://github.com/apollographql/apollo-link/pull/436)
- udate apollo link with zen-observable-ts [PR#515](https://github.com/apollographql/apollo-link/pull/515)

### 2.1.0
- add `retryIf` [PR#324](https://github.com/apollographql/apollo-link/pull/324)

### 2.0.2
- ApolloLink upgrade

### 2.0.1
- ApolloLink upgrade

### 2.0.0
- Entirely rewritten to address a number of flaws including a new API to prevent DOSing your own server when it may be down. Thanks @nevir for the amazing work!

### 1.0.2
- changed peer-dependency of apollo-link to actual dependency

### 1.0.1
- moved to better rollup build

### 1.0.0
- moved from default export to named to be consistent with rest of link ecosystem
