import {
  Operation,
} from './types';
import {
  DocumentNode,
  DefinitionNode,
  OperationDefinitionNode,
} from 'graphql/language/ast';
import { print } from 'graphql';
import 'isomorphic-fetch';

export default class HttpUtils {

  public static buildURI(uri: string, operation: Operation): string {
    return `${uri}?${HttpUtils.queryParameters(operation)}`;
  }

  public static getRequestType(query: DocumentNode) {
    const definitions = query.definitions;
    const nonQuery = definitions.find(def => !this.isOperationType(def, 'query'));
    return nonQuery ? 'POST' : 'GET';
  }

  private static queryParameters(op: Operation): string {
    let params = [];
    if (op.query) {
      params.push(`query=${encodeURIComponent(print(op.query))}`);
    }
    if (op.operationName) {
      params.push(`operationName=${encodeURIComponent(op.operationName)}`);
    }
    if (op.variables) {
      params.push(`variables=${encodeURIComponent(JSON.stringify(op.variables))}`);
    }
    if (op.context) {
      params.push(`context=${encodeURIComponent(JSON.stringify(op.context))}`);
    }

    return params.join('&');
  }

  private static isOperationType(definition: DefinitionNode, operationType: string): boolean {
    if (definition.kind !== 'OperationDefinition') {
      return false;
    }
    const operationNode = <OperationDefinitionNode>definition;
    return operationNode.operation === operationType;
  }

}
