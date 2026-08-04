import { QueryFunctionContext, QueryKey, QueryObserver, QueryObserverOptions, QueryObserverResult } from "@tanstack/react-query";
import { DEFAULT_METHOD_OPTIONS, onQueryError, queryClient, unwrapQueryFnData } from "./config";
import { makeAutoObservable, runInAction } from "mobx";
import { AsyncServiceMethodOptions, ServerError } from "./types";

export class QueryService<TResult = unknown> {
  unsubscribe?: () => void;

  queryClient = queryClient;
  observer?: QueryObserver;
  private queryParams?: QueryObserverOptions<unknown, unknown, unknown, unknown, QueryKey>;
  queryResult?: QueryObserverResult<TResult>;

  /** Данные последнего запроса. Undefined, пока запрос не завершился успехом. */
  get data() {
    return this.queryResult?.data;
  }

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

    // Разворачиваем на записи, чтобы в кэш попадали предметные данные, а не
    // HTTP-конверт. Ошибки идут мимо: queryFn их бросает, а не возвращает.
    const unwrap = unwrapQueryFnData;
    const rawQueryFn = params.queryFn;
    const unwrappedQueryFn =
      !unwrap || !rawQueryFn
        ? rawQueryFn
        : async (context: QueryFunctionContext<TQueryKey>) =>
            unwrap(await rawQueryFn(context)) as TQueryFnData;

    return new Promise<TData | undefined>((resolve, reject) => {
      this.queryParams = {
        ...params,
        retry: false,
        queryFn: unwrappedQueryFn,
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

          // Промис обязан завершиться в любом случае: если не реджектим —
          // резолвим undefined, иначе await зависает навсегда.
          if (options?.rejectable) {
            reject(error);
          } else {
            resolve(undefined);
          }

          runInAction(() => {
            this.isQueryFullLoading = false;
          });
        },
      } as QueryObserverOptions<unknown, unknown, unknown, unknown, QueryKey>;

      this.observer?.setOptions(this.queryParams);

      this.unsubscribe = this.observer?.subscribe(result => {
        runInAction(() => {
          this.queryResult = result as QueryObserverResult<TResult>;
          this.isQueryLoading = Boolean(result?.isLoading);
          this.isQueryFetching = Boolean(result?.isFetching);
        });
      });

      this.queryResult = this.observer?.getOptimisticResult({
        useErrorBoundary: false,
        refetchOnReconnect: false,
        ...this.queryParams,
      }) as QueryObserverResult<TResult> | undefined;

      // Свой onSuccess зовём, только если данные взяты из кэша и запроса не будет:
      // при идущем запросе его вызовет сам react-query, иначе получим двойной вызов.
      if (this.queryResult?.data && !this.queryResult.isFetching) {
        this.queryParams.onSuccess?.(this.queryResult.data);
      }
    });
  };

  /**
   * Кладёт данные в кэш: ответ мутации уже содержит свежую сущность,
   * перезапрашивать её незачем.
   *
   * queryKey нужен, когда запроса ещё не было — например, сущность только что
   * создали. Тогда сервис заодно начинает следить за этим ключом, иначе
   * читать data было бы неоткуда.
   */
  setData = (data: TResult, queryKey?: QueryKey) => {
    const key = queryKey ?? this.queryParams?.queryKey;

    if (!key) {
      return;
    }

    if (!this.queryParams?.queryKey) {
      this.observe(key);
    }

    this.queryClient.setQueryData(key, data);
  };

  /** Следит за ключом, не запрашивая его: данные берутся из кэша. */
  private observe = (queryKey: QueryKey) => {
    this.createNewObserver();

    this.queryParams = { queryKey, enabled: false };
    this.observer?.setOptions(this.queryParams);

    this.unsubscribe = this.observer?.subscribe((result) => {
      runInAction(() => {
        this.queryResult = result as QueryObserverResult<TResult>;
      });
    });

    this.queryResult = this.observer?.getOptimisticResult({
      useErrorBoundary: false,
      refetchOnReconnect: false,
      ...this.queryParams,
    }) as QueryObserverResult<TResult>;
  };

  /**
   * Удаляет из кэша запрос, которым сейчас занят сервис.
   * Сервис в каждый момент держит ровно один запрос, поэтому ключ не нужен.
   */
  remove = () => {
    if (this.queryParams?.queryKey) {
      this.queryClient.removeQueries({ queryKey: this.queryParams.queryKey });
    }

    // Удаление из кэша не уведомляет обсервер, поэтому свой результат чистим сами.
    runInAction(() => {
      this.queryResult = undefined;
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