import { QueryFunctionContext, QueryKey, QueryObserver, QueryObserverOptions, QueryObserverResult } from "@tanstack/query-core";
import { DEFAULT_METHOD_OPTIONS, onQueryError, queryClient, unwrapQueryFnData } from "./config";
import { makeAutoObservable, runInAction } from "mobx";
import { AsyncServiceMethodOptions, ServerError } from "./types";

export class QueryService<TResult = unknown> {
  unsubscribe?: () => void;

  queryClient = queryClient;
  observer?: QueryObserver;
  private queryParams?: QueryObserverOptions<unknown, Error, unknown, unknown, QueryKey>;
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
   * Первый запрос ещё не завершился — в том числе если он ещё не начинался.
   * Этим отличается от isQueryLoading, который до первого fetch равен false.
   */
  isQueryInitialLoading = true;

  constructor() {
    makeAutoObservable(this);
  }

  /** getOptimisticResult ждёт options с заполненными дефолтами. */
  private defaulted = (options: unknown) =>
    options as Parameters<QueryObserver["getOptimisticResult"]>[0];

  private createNewObserver = () => {
    this.destroyObserver();
    this.observer = new QueryObserver(queryClient, { queryKey: [] as QueryKey })
  }

  /**
   * Аналог useQuery: подписывается на запрос и ждёт первого результата.
   * У запросов в v5 нет onSuccess/onError, поэтому промис завершаем сами —
   * по первому успеху или ошибке в потоке результатов.
   */
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
    this.isQueryInitialLoading = true;

    // Разворачиваем на записи, чтобы в кэш попадали предметные данные, а не
    // HTTP-конверт. Ошибки идут мимо: queryFn их бросает, а не возвращает.
    const unwrap = unwrapQueryFnData;
    const rawQueryFn = params.queryFn;
    const unwrappedQueryFn =
      !unwrap || !rawQueryFn || typeof rawQueryFn !== "function"
        ? rawQueryFn
        : async (context: QueryFunctionContext<TQueryKey>) =>
            unwrap(await rawQueryFn(context)) as TQueryFnData;

    this.queryParams = {
      ...params,
      retry: false,
      queryFn: unwrappedQueryFn,
    } as QueryObserverOptions<unknown, Error, unknown, unknown, QueryKey>;

    this.observer?.setOptions(this.queryParams);

    return new Promise<TData | undefined>((resolve, reject) => {
      let isSettled = false;

      const settle = (result: QueryObserverResult<TResult, Error>) => {
        if (isSettled || result.isFetching) {
          return;
        }

        if (result.isSuccess) {
          isSettled = true;
          runInAction(() => {
            this.isQueryInitialLoading = false;
          });
          resolve(result.data as unknown as TData);

          return;
        }

        if (result.isError) {
          isSettled = true;
          options?.hasToast && onQueryError?.(result.error as ServerError);
          runInAction(() => {
            this.isQueryInitialLoading = false;
          });

          if (options?.rejectable) {
            reject(result.error);
          } else {
            // Промис обязан завершиться в любом случае: иначе await зависает.
            resolve(undefined);
          }
        }
      };

      this.unsubscribe = this.observer?.subscribe((result) => {
        runInAction(() => {
          this.queryResult = result as QueryObserverResult<TResult>;
          this.isQueryLoading = Boolean(result?.isPending);
          this.isQueryFetching = Boolean(result?.isFetching);
        });

        settle(result as QueryObserverResult<TResult, Error>);
      });

      this.queryResult = this.observer?.getOptimisticResult(
        this.defaulted({
          throwOnError: false,
          refetchOnReconnect: false,
          ...this.queryParams,
        }),
      ) as QueryObserverResult<TResult> | undefined;

      // Данные уже в кэше и запроса не будет — завершаем сразу.
      if (this.queryResult) {
        settle(this.queryResult as QueryObserverResult<TResult, Error>);
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
      throw new Error(
        "QueryService.setData: до первого fetch нужен queryKey — иначе данные некуда положить и неоткуда читать",
      );
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

    this.queryResult = this.observer?.getOptimisticResult(
      this.defaulted(this.queryParams),
    ) as QueryObserverResult<TResult>;
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