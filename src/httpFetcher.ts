import { ApolloFetcher, Observable, FetchResult, Subscriber, Operation, State } from './types';
import { toSubscriber } from './subscriber';
import { print } from 'graphql';
import { DocumentNode, DefinitionNode, OperationDefinitionNode } from 'graphql/language/ast';
import 'isomorphic-fetch';

export class HttpObservable implements Observable {
  private _request: () => Promise<Response>;
  private subscribers: Array<Subscriber<FetchResult>>;
  private state: State;

  constructor(request: () => Promise<Response>) {
    this._request = request;
    this.subscribers = [];
    this.state = State.COLD;
    this.onNext = this.onNext.bind(this);
    this.onError = this.onError.bind(this);
    this.onComplete = this.onComplete.bind(this);
  }

  public start() {
    if (this.state !== State.COLD) {
      throw Error('Observer already started');
    }

    this.handleResponse(this._request());
    this.state = State.STARTED;
  }

  public stop() {
    if (this.state !== State.COLD && this.state !== State.STARTED) {
      throw Error('Observer already terminated');
    }

    this.onComplete();
    this.subscribers = [];
    this.state = State.STOPPED;
  }

  public subscribe(
    nextOrSubscriber: Subscriber<FetchResult> | ((result: FetchResult) => void),
    error?: (error: any) => void,
    complete?: () => void) {

    const subscriber = toSubscriber<FetchResult>(nextOrSubscriber, error, complete);

    if (this.state !== State.COLD && this.state !== State.STARTED ) {
      //could also throw error
      subscriber.complete();
      return null;
    }

    this.subscribers.push(subscriber);

    if (this.state === State.COLD) {
      this.start();
    }

    return () => {
      //remove the first matching subscriber, since a subscriber could subscribe multiple times a filter will not work
      this.subscribers.splice(this.subscribers.indexOf(subscriber), 1);
      if (this.subscribers.length === 0) {
        this.stop();
      }
    };
  }

  public status() {
    return {
      state: this.state,
      numberSubscribers: this.subscribers.length,
    };
  }

  private handleResponse(response: Promise<Response>) {
      response.then( result => result.json() )
      .then(
        data => {
          this.onNext(data);
          this.onComplete();
        },
      )
      .catch(this.onError);
  }

  private onNext = (data) => {
    this.subscribers.forEach(subscriber => setTimeout(() => subscriber.next({ data }), 0));
  }

  private onError = (error) => {
    this.subscribers.forEach(subscriber => subscriber.error ? setTimeout(() => subscriber.error(error), 0) : null);
    this.state = State.ERRORED;
  }

  private onComplete = () => {
    this.subscribers.forEach(subscriber => subscriber.complete ? setTimeout(subscriber.complete, 0) : null);
    this.state = State.COMPLETED;
  }
}

export default class HttpFetcher implements ApolloFetcher {

  private fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;

  constructor(
    private uri?: string,
    customFetch?: (input: RequestInfo, init?: RequestInit) => Promise<Response>) {

    this.fetch = customFetch ? customFetch : fetch;

  }

  public request(operation: Operation): Observable {
    if (!this.checkOperation(operation)) {
      //TODO provide exact argument
      throw new Error('illegal argument');
    }
    const { query, variables, operationName, context } = operation;

    //Queries sent with GET requests
    const method = this.getRequestType(query);

    const headers = { 'Accept': '*/*' };
    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }

    return new HttpObservable(
      () => this.fetch(
        method === 'GET' ? this.buildURI(this.uri, operation) : this.uri,
        {
          body: JSON.stringify({
            query: print(query),
            variables: variables || {},
            operationName,
            context,
          }),
          method,
          headers,
      }),
    );
  }

  private queryParameters(op: Operation): string {
    const query = encodeURIComponent(print(op.query).replace(/\s\s+/g, ' '));

    let params = `query=${query}`;
    params += op.operationName ? `&operationName=${encodeURIComponent(op.operationName)}` : '';
    params += op.variables ? `&variables=${encodeURIComponent(JSON.stringify(op.variables))}` : '';
    params += op.context ? `&context=${encodeURIComponent(JSON.stringify(op.context))}` : '';

    return params;
  }

  private buildURI(uri: string, operation: Operation): string {
    return `${uri}?${this.queryParameters(operation)}`;
  }

  private isQuery(definition: DefinitionNode): boolean {
    if (definition.kind !== 'OperationDefinition') {
      return false;
    }
    const operationNode = <OperationDefinitionNode>definition;
    return operationNode.operation === 'query';
  }

  private getRequestType(query: DocumentNode) {
    const definitions = query.definitions;
    const nonQuery = definitions.find(def => !this.isQuery(def));
    return nonQuery ? 'POST' : 'GET';
  }

  private checkOperation(operation: Operation): boolean {
    let count = 0;
    count += operation.hasOwnProperty('query') ? 1 : 0;
    count += operation.hasOwnProperty('operationName') ? 1 : 0;
    count += operation.hasOwnProperty('variables') ? 1 : 0;
    count += operation.hasOwnProperty('context') ? 1 : 0;

    return count === Object.keys(operation).length;
  }
}
