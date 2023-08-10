import { MutationObserver, MutationObserverOptions, MutationObserverResult } from "@tanstack/react-query";
import { DEFAULT_METHOD_OPTIONS, onMutationError, queryClient } from "config";
import { makeAutoObservable, runInAction } from "mobx";
import { AsyncServiceMethodOptions, ServerError } from "types";

export class MutationService {
  queryClient = queryClient;
  observer = new MutationObserver(queryClient, {});

  mutationResult?: MutationObserverResult<
    unknown,
    ServerError,
    unknown,
    unknown
  >;

  /**
  * при выполнении мутации (fetchMutation)
  */
  isMutationLoading = false;

  /**
  * при выполнении мутации, заканчивается только после отработки onSuccess/onError (fetchMutation)
  */
  isMutationFullLoading = false;

  constructor() {
    makeAutoObservable(this);
  }

  /** Аналог useMutation */
  fetch = async <
    TData = unknown,
    TVariables = unknown,
    TContext = unknown,
  >(
    params: MutationObserverOptions<TData, ServerError, TVariables, TContext>,
    options: Partial<AsyncServiceMethodOptions> = DEFAULT_METHOD_OPTIONS,
  ) => {
    this.mutationResult = undefined;
    this.isMutationLoading = false;
    this.isMutationFullLoading = true;

    return new Promise<TData>((resolve, reject) => {
      const _params = {
        ...params,
        onSuccess: (data: TData, variables: TVariables, context: TContext | undefined) => {
          params.onSuccess?.(data, variables, context);
          resolve(data);

          runInAction(() => {
            this.isMutationFullLoading = false;
          })
        },
        onError: (
          error: ServerError,
          variables: TVariables,
          context?: TContext,
        ) => {
          options?.hasToast && onMutationError?.(error);
          params.onError && params.onError(error, variables, context);

          runInAction(() => {
            this.isMutationFullLoading = false;
          })
        },
      } as MutationObserverOptions;

      this.observer.setOptions(_params);

      this.observer.subscribe(result => {
        runInAction(() => {
          this.isMutationLoading = result.isLoading;
          
          this.mutationResult = result as MutationObserverResult<
            unknown,
            ServerError,
            unknown,
            unknown
          >;
        });
      });

      this.observer.mutate().catch(error => options?.rejectable && reject(error));
    });
  };
}