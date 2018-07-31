import {
  ApolloLink,
  Operation,
  NextLink,
  FetchResult,
  Observable,
  ExecutionResult,
} from 'apollo-link';

interface ExecutionPatchResult extends ExecutionResult {
  path: (string | number)[];
}

function isPatch(result: FetchResult): result is ExecutionPatchResult {
  return Array.isArray((result as ExecutionPatchResult).path);
}

export class DeferPatchLink extends ApolloLink {
  private partialResults: Map<string, FetchResult> = new Map();

  public request(
    operation: Operation,
    forward: NextLink,
  ): Observable<FetchResult> {
    const key = operation.toKey();

    return new Observable<FetchResult>(observer => {
      forward(operation).subscribe({
        next: (data: FetchResult) => {
          if (this.partialResults[key]) {
            if (isPatch(data)) {
              // Merge patch into the partial result
              this.mergePatch(this.partialResults[key], data);
            } else {
              // Replace existing partial result
              this.partialResults[key] = data;
            }
          } else {
            if (!isPatch(data)) {
              this.partialResults[key] = data;
            } else {
              throw new Error(
                'Patch should not be received before initial response',
              );
            }
          }
          observer.next(this.partialResults[key]);
        },
        error: error => {
          this.cleanup(key);
          observer.error(error);
        },
        complete: () => {
          this.cleanup(key);
          observer.complete();
        },
      });
    });
  }

  private cleanup(key: string): void {
    this.partialResults.delete(key);
  }

  private mergePatch(result: FetchResult, patch: ExecutionPatchResult): void {
    if (result.data && patch.data) {
      let curKeyIndex = 0;
      let curKey: string | number;
      let curPointer: Record<string, {}> = result.data as Record<string, {}>;
      while (curKeyIndex !== patch.path.length) {
        curKey = patch.path[curKeyIndex++];
        const isLeaf = curKeyIndex === patch.path.length;
        if (isLeaf) {
          if (patch.data) {
            // Data may not exist if there is an error in the patch
            curPointer[curKey] = patch.data;
          }
        } else {
          if (curPointer[curKey] === undefined) {
            // This is indicative of a patch that is not ready to be merged, which
            // can happen if patches for inner objects arrive before its parent.
            // The graphql execution phase must make sure that this does not
            // happen.
            throw new Error(
              `Failed to merge patch with path '[${patch.path}]'`,
            );
          }
          if (curPointer[curKey] === null) {
            // Check whether it should be an array or an object by looking at the
            // next key, then create the object if it is not present.
            if (typeof patch.path[curKeyIndex] === 'string') {
              curPointer[curKey] = {};
            } else if (typeof patch.path[curKeyIndex] === 'number') {
              curPointer[curKey] = [];
            }
          }
          curPointer = curPointer[curKey];
        }
      }
    }

    if (patch.errors) {
      // Merge errors with existing errors array
      if (result.errors) {
        result.errors = result.errors.concat(patch.errors);
      } else {
        result.errors = patch.errors;
      }
    }
  }
}
