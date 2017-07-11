import {
  ApolloLink,
  Operation,
} from './types';
import * as Observable from 'zen-observable';


export default class PollingLink implements ApolloLink {

  private link: ApolloLink;
  private pollInterval: number;

  constructor(link: ApolloLink, pollInterval: number) {
    this.link = link;
    this.pollInterval = pollInterval || 0;
  }

  public request(operation: Operation) {
    return new Observable(observer => {
      setTimeout(() => {
        if (!observer.closed) {
          this.link.request(operation).subscribe(observer);
        }
      }, this.pollInterval);

      this.link.request(operation).subscribe(
        observer,
      );
    });
  }

}
