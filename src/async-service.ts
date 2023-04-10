import { makeAutoObservable, runInAction } from 'mobx';
import {
  InfiniteQueryObserver,
  InfiniteQueryObserverOptions,
  InfiniteQueryObserverResult,
  MutationObserver,
  MutationObserverOptions,
  MutationObserverResult,
  QueryClient,
  QueryKey,
  QueryObserver,
  QueryObserverOptions,
  QueryObserverResult,
} from '@tanstack/react-query';

type OnErrorCallback = ((error: ServerError) => void) | undefined;

interface AsyncServiceConfiguration {
  queryClient?: QueryClient;

  /** Удобно класть общую обработку ошибок. Например тосты */
  onQueryError?: OnErrorCallback;

  /** Удобно класть общую обработку ошибок. Например тосты */
  onInfiniteQueryError?: OnErrorCallback;

  /** Удобно класть общую обработку ошибок. Например тосты */
  onMutationyError?: OnErrorCallback;
}

/***
 * rejectable - выключает reject ошибок, в onError, onSettled все еще будет приходить
 */
type AsyncServiceMethodOptions =
  | { hasToast: boolean; rejectable: boolean }
  | undefined;

type ServerErrorResponse = Record<string, any>;
type ServerError = ServerErrorResponse;

export let queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 300 * 1000, // сброс кэша каждые 5 мин
      retry: false, // без попыток повторить запрос, если пришел с ошибкой
      refetchOnWindowFocus: false,
    },
  },
});

let onQueryError: OnErrorCallback;
let onInfiniteQueryError: OnErrorCallback;
let onMutationyError: OnErrorCallback;

export const configureAsyncService = (options: AsyncServiceConfiguration) => {
  if(options?.queryClient) {
    queryClient = options?.queryClient;
  }

  if(options?.onQueryError) {
    onQueryError = options?.onQueryError;
  }

  if(options?.onInfiniteQueryError) {
    onInfiniteQueryError = options?.onInfiniteQueryError;
  }

  if(options?.onMutationyError) {
    onMutationyError = options?.onMutationyError;
  }
}


/**
 * При необходимости добавить QueriesObserver по аналогии для нескольких запросов для подтягивания данных
 */
export class AsyncService {
  queryResult?: QueryObserverResult;
  mutationResult?: MutationObserverResult<
    unknown,
    ServerError,
    unknown,
    unknown
  >;

  /**
   * true - при выполнении мутации (fetchMutation)
   */
  isMutationLoading = false;

  /**
   * true - только при выполнении первого фетчинга (fetchQuery)
   */
  isQueryLoading = false;

  /**
   * true - при выполнении следующем фетчинга (fetchInfiniteQuery)
   */
  isFetchingNextPage = false;

  /**
   * Вызывается только при первом фетчинге, завершается после выполнения onSuccess или onError (как правило GET)
   * За место него подойдет isQueryNotReady
   */
  private isQueryFullLoading = false;

  /**
   * Вызывается каждый фетчинг, в том числе при инвалидации (как правило GET)
   */
  isQueryFetching = false;

  constructor() {
    makeAutoObservable(this);
  }

  get isIdle() {
    return !this.queryResult || this.queryResult.status === 'loading';
  }

  /**
   * Вызов был вызван, были завершены onSuccess / onError
   * Подойдет для большинства кейсов и будет работать правильнее. Вместо isQueryFullLoading / isQueryLoading
   */
  get isQueryNotReady() {
    return this.isIdle || this.isQueryFullLoading;
  }

  /** Для работы с мутациями (Аналог useMutation) */
  fetchMutation = async <
    TData = unknown,
    TVariables = unknown,
    TContext = unknown,
  >(
    params: MutationObserverOptions<TData, ServerError, TVariables, TContext>,
    options: Partial<AsyncServiceMethodOptions> = {
      hasToast: true,
      rejectable: true,
    },
  ) => {
    this.mutationResult = undefined;
    this.isMutationLoading = false;

    return new Promise<TData>((resolve, reject) => {
      const _params = {
        ...params,
        onSuccess: (data: TData, variables: TVariables, context: TContext | undefined) => {
          params.onSuccess?.(data, variables, context);
          resolve(data);
        },
        onError: (
          error: ServerError,
          variables: TVariables,
          context?: TContext,
        ) => {
          options?.hasToast && onMutationyError?.(error);
          params.onError && params.onError(error, variables, context);
        },
      };

      const observer = new MutationObserver(queryClient, _params);

      observer.subscribe(result => {
        runInAction(() => {
          this.mutationResult = result as MutationObserverResult<
            unknown,
            ServerError,
            unknown,
            unknown
          >;
          this.isMutationLoading = result.isLoading;
        });
      });

      observer.mutate().catch(error => options?.rejectable && reject(error));
    });
  };

  observer = new QueryObserver(queryClient, {});

  /** Для работы query. (Аналог useQuery) */
  fetchQuery = async <
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
    options: Partial<AsyncServiceMethodOptions> = {
      hasToast: true,
      rejectable: true,
    },
  ) => {
    this.queryResult = undefined;
    this.isQueryLoading = false;

    // тут начинаем лоадер
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

  /** Для работы с бесконечной подрузкой данных (аналог useInfiniteQuery) */
  fetchInfiniteQuery = <
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
    options: Partial<AsyncServiceMethodOptions> = {
      hasToast: true,
      rejectable: true,
    },
  ) => {
    this.queryResult = undefined;
    this.isQueryLoading = false;

    const _params = {
      ...params,
      onError: (error: ServerError) => {
        options?.hasToast && onInfiniteQueryError?.(error);
        params.onError && params.onError(error);
      },
    };

    const observer = new InfiniteQueryObserver(queryClient, _params);

    observer.subscribe(
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
    const result = observer.getOptimisticResult({
      useErrorBoundary: false,
      refetchOnReconnect: false,
      ..._params
    });

    if (result.data) {
      _params.onSuccess && _params.onSuccess(result.data);
    }

    return observer;
  };
}
