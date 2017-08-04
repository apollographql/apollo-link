import { assert, expect } from 'chai';
import * as sinon from 'sinon';
import DedupLink from '../src/dedupLink';

import * as Links from 'apollo-link-core';
import { ApolloLink, execute } from 'apollo-link-core';

import { createApolloFetch } from 'apollo-fetch';

import { print } from 'graphql';
import gql from 'graphql-tag';
import * as fetchMock from 'fetch-mock';

describe('DedupLink', () => {});
