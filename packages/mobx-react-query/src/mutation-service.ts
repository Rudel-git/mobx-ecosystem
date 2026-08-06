import { MutationObserver, MutationObserverOptions, MutationObserverResult } from "@tanstack/query-core";
import { DEFAULT_METHOD_OPTIONS, onMutationError, queryClient } from "./config";
import { makeAutoObservable, runInAction } from "mobx";
import { AsyncServiceMethodOptions, ServerError } from "./types";

interface MutationFetch {
  <TData = unknown, TVariables = unknown, TContext = unknown>(
    params: MutationObserverOptions<TData, ServerError, TVariables, TContext>,
    options: Partial<AsyncServiceMethodOptions> & { rejectable: true },
  ): Promise<TData>;

  <TData = unknown, TVariables = unknown, TContext = unknown>(
    params: MutationObserverOptions<TData, ServerError, TVariables, TContext>,
    options?: Partial<AsyncServiceMethodOptions>,
  ): Promise<TData | undefined>;
}

export class MutationService {
  unsubscribe?: () => void;
  queryClient = queryClient;
  observer?: MutationObserver = new MutationObserver(queryClient, {});
  private params?: MutationObserverOptions;

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

  dispose = () => {
    if(this.observer) {
      this.unsubscribe?.();
      this.observer.reset();
      this.observer = undefined;
      this.mutationResult = undefined;
      this.unsubscribe = undefined;
    }
  }

  /**
   * Аналог useMutation.
   *
   * С `rejectable: true` ошибка уходит в reject, поэтому результат
   * всегда определён; без него промис резолвится в undefined.
   */
  fetch: MutationFetch = async <
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

    return new Promise<TData | undefined>((resolve, reject) => {
       this.params = {
        ...params,
        // Аргументы прокидываем как есть: их состав менялся между версиями.
        onSuccess: (...args: Parameters<NonNullable<typeof params.onSuccess>>) => {
          params.onSuccess?.(...args);
          resolve(args[0]);

          runInAction(() => {
            this.isMutationFullLoading = false;
          })
        },
        onError: (...args: Parameters<NonNullable<typeof params.onError>>) => {
          const [error] = args;

          options?.hasToast && onMutationError?.(error);
          params.onError?.(...args);

          runInAction(() => {
            this.isMutationFullLoading = false;
          })

          // Промис обязан завершиться в любом случае: если не реджектим —
          // резолвим undefined, иначе await зависает навсегда.
          if (options?.rejectable) {
            reject(error);
          } else {
            resolve(undefined);
          }
        },
      } as unknown as MutationObserverOptions;

      this.observer?.setOptions(this.params);

      this.unsubscribe = this.observer?.subscribe(result => {
        runInAction(() => {
          this.isMutationLoading = result.isPending;

          this.mutationResult = result as MutationObserverResult<
            unknown,
            ServerError,
            unknown,
            unknown
          >;
        });
      });

      // Ошибку разбирает onError выше, а промис mutate игнорируем:
      // иначе на каждой неудачной мутации будет необработанный отказ.
      this.observer?.mutate().catch(() => undefined);
    });
  };
}