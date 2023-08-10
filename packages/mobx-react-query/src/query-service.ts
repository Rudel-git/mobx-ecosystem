import { QueryKey, QueryObserver, QueryObserverOptions, QueryObserverResult } from "@tanstack/react-query";
import { DEFAULT_METHOD_OPTIONS, onQueryError, queryClient } from "config";
import { makeAutoObservable, runInAction } from "mobx";
import { AsyncServiceMethodOptions, ServerError } from "./types";

export class QueryService {
  queryClient = queryClient;
  observer = new QueryObserver(queryClient, {});
  queryResult?: QueryObserverResult;

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

  constructor() {
    makeAutoObservable(this);
  }

  /**
   * initWithLoading - isQueryFullLoading будет true сразу
   */
  setSettings = (settings: { initWithLoading?: boolean }) => {
    this.isQueryFullLoading = settings?.initWithLoading || true;
  }

  /** Аналог useQuery */
  fetch = async <
    TQueryFnData = unknown,
    TData = TQueryFnData,
    TQueryData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
  >(
    params: QueryObserverOptions<
      TQueryFnData,
      ServerError,
      TData,
      TQueryData,
      TQueryKey
    >,
    options: Partial<AsyncServiceMethodOptions> = DEFAULT_METHOD_OPTIONS,
  ) => {
    this.isQueryLoading = false;
    this.isQueryFullLoading = true;

    return new Promise<TData>((resolve, reject) => {
      const _params = {
        ...params,
        retry: false,
        onSuccess: (data: TData) => {
          params.onSuccess?.(data);
          resolve(data);

          runInAction(() => {
            this.isQueryFullLoading = false;
          });
        },
        onError: (error: ServerError) => {
          options?.hasToast && onQueryError?.(error);
          params.onError?.(error);
          options?.rejectable && reject(error);

          runInAction(() => {
            this.isQueryFullLoading = false;
          });
        },
      } as QueryObserverOptions<unknown, unknown, unknown, unknown, QueryKey>;

      this.observer.setOptions(_params);

      this.observer.subscribe(result => {
        runInAction(() => {
          this.queryResult = result;
          this.isQueryLoading = Boolean(result?.isLoading);
          this.isQueryFetching = Boolean(result?.isFetching);
        });
      });

      // onSuccess будет вызываться всегда 1 раз
      // 1 вариант - getOptimisticResult вызовет его, если это запрос. Наш вызов не сработает, так как запрос не успеет выполнится
      // 2 вариант - запрос не выполняется, данные уже есть в кэше - выполняется наш onSuccess
      this.queryResult = this.observer.getOptimisticResult({
        useErrorBoundary: false,
        refetchOnReconnect: false,
        ..._params,
      });

      if (this.queryResult.data) {
        _params.onSuccess && _params.onSuccess(this.queryResult.data);
      }
    });
  };
}