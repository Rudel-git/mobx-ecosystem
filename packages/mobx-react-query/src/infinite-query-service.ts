import { InfiniteQueryObserver, InfiniteQueryObserverOptions, InfiniteQueryObserverResult, QueryKey } from "@tanstack/react-query";
import { DEFAULT_METHOD_OPTIONS, onInfiniteQueryError, queryClient } from "config";
import { makeAutoObservable, runInAction } from "mobx";
import { AsyncServiceMethodOptions, ServerError } from "types";

export class InfiniteQueryService {
  queryClient = queryClient;
  observer = new InfiniteQueryObserver(queryClient, {});
  queryResult?: InfiniteQueryObserverResult;

  /**
   * при выполнении первого фетчинга (fetchQuery)
  */
  isQueryLoading = false;

  /**
   * Вызывается каждый фетчинг, в том числе при инвалидации
   */
  isQueryFetching = false;

  /**
   * Вызывается только при первом фетчинге, завершается после выполнения onSuccess/onError
   * Начальное значение настраивается через setSettings
   * @default true
   */
  isQueryFullLoading = true;

  isFetchingNextPage = false;

  constructor() {
    makeAutoObservable(this);
  }

  /** аналог useInfiniteQuery */
  fetch = <
    TQueryFnData = unknown,
    TData = TQueryFnData,
    TQueryData = TQueryFnData,
  >(
    params: InfiniteQueryObserverOptions<
      TQueryFnData,
      ServerError,
      TData,
      TQueryData,
      QueryKey
    >,
    options: Partial<AsyncServiceMethodOptions> = DEFAULT_METHOD_OPTIONS,
  ) => {
    this.isQueryLoading = false;

    const _params = {
      ...params,
      onError: (error: ServerError) => {
        options?.hasToast && onInfiniteQueryError?.(error);
        params.onError && params.onError(error);
      },
    } as InfiniteQueryObserverOptions<unknown, unknown, unknown, unknown, QueryKey>;

    this.observer.subscribe(
      (result: InfiniteQueryObserverResult<unknown, unknown> | undefined) => {
        runInAction(() => {
          this.queryResult = result;

          this.isQueryLoading = Boolean(result?.isLoading);
          this.isQueryFetching = Boolean(result?.isFetching);
          this.isFetchingNextPage = Boolean(result?.isFetchingNextPage);
        });
      },
    );

    // onSuccess будет вызываться всегда 1 раз
    // 1 вариант - getOptimisticResult вызовет его, если это запрос. Наш вызов не сработает, так как запрос не успеет выполнится
    // 2 вариант - запрос не выполняется, данные уже есть в кэше - выполняется наш onSuccess
    const result = this.observer.getOptimisticResult({
      useErrorBoundary: false,
      refetchOnReconnect: false,
      ..._params
    });

    if (result.data) {
      _params.onSuccess && _params.onSuccess(result.data);
    }

    return this.observer;
  };
}