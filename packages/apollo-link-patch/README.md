---
title: apollo-link-patch
description: Merge patches sent back from partial query responses
---

## DeferPatchLink
This link adds the ability to merge patches from a deferred query into the initial response that was sent. It emits a partial result for every patch received.

> Note: Apollo Client already implements the logic to merge patches internally. DeferPatchLink duplicates that logic so that we can parse deferred queries outside Apollo Client.

DeferPatchLink must be layered on top of a HttpLink that supports reading a Multipart HTTP response, that emits data for each segment. 