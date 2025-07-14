import { QueryKey, QueryObserver, QueryObserverOptions, QueryObserverResult } from "@tanstack/react-query";
import { DEFAULT_METHOD_OPTIONS, onQueryError, queryClient } from "config";
import { makeAutoObservable, runInAction } from "mobx";
import { AsyncServiceMethodOptions, ServerError } from "./types";

export class QueryService {
  unsubscribe?: () => void;

  queryClient = queryClient;
  observer?: QueryObserver;
  private queryParams?: QueryObserverOptions<unknown, unknown, unknown, unknown, QueryKey>;
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

  private createNewObserver = () => {
    this.destroyObserver();
    this.observer = new QueryObserver(queryClient, {})
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
    this.createNewObserver();

    this.isQueryLoading = false;
    this.isQueryFullLoading = true;

    return new Promise<TData>((resolve, reject) => {
      this.queryParams = {
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

      this.observer?.setOptions(this.queryParams);

      this.unsubscribe = this.observer?.subscribe(result => {
        runInAction(() => {
          this.queryResult = result;
          this.isQueryLoading = Boolean(result?.isLoading);
          this.isQueryFetching = Boolean(result?.isFetching);
        });
      });

      // onSuccess будет вызываться всегда 1 раз
      // 1 вариант - getOptimisticResult вызовет его, если это запрос. Наш вызов не сработает, так как запрос не успеет выполнится
      // 2 вариант - запрос не выполняется, данные уже есть в кэше - выполняется наш onSuccess
      this.queryResult = this.observer?.getOptimisticResult({
        useErrorBoundary: false,
        refetchOnReconnect: false,
        ...this.queryParams,
      });

      if (this.queryResult?.data) {
        this.queryParams.onSuccess && this.queryParams.onSuccess(this.queryResult.data);
      }
    });
  };

  private destroyObserver = () => {
    this.unsubscribe?.();
    this.observer?.destroy();
    this.observer = undefined;
    this.unsubscribe = undefined;
  }

  dispose = () => {
    if(this.observer) {
      this.destroyObserver();

      this.queryResult = undefined;
      this.queryParams = undefined;
    }
  }
}