import { InfiniteQueryObserver, InfiniteQueryObserverOptions, MutationObserverOptions, MutationObserverResult, QueryClient, QueryKey, QueryObserver, QueryObserverOptions, QueryObserverResult } from 'react-query/core';
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
type AsyncServiceMethodOptions = {
    hasToast: boolean;
    rejectable: boolean;
} | undefined;
type ServerErrorResponse = Record<string, any>;
type ServerError = ServerErrorResponse;
export declare let queryClient: QueryClient;
export declare const configureAsyncService: (options: AsyncServiceConfiguration) => void;
/**
 * При необходимости добавить QueriesObserver по аналогии для нескольких запросов для подтягивания данных
 */
export declare class AsyncService {
    queryResult?: QueryObserverResult;
    mutationResult?: MutationObserverResult<unknown, ServerError, unknown, unknown>;
    /**
     * true - при выполнении мутации (fetchMutation)
     */
    isMutationLoading: boolean;
    /**
     * true - только при выполнении первого фетчинга (fetchQuery)
     */
    isQueryLoading: boolean;
    /**
     * true - при выполнении следующем фетчинга (fetchInfiniteQuery)
     */
    isFetchingNextPage: boolean;
    /**
     * Вызывается только при первом фетчинге, завершается после выполнения onSuccess или onError (как правило GET)
     * За место него подойдет isQueryNotReady
     */
    private isQueryFullLoading;
    /**
     * Вызывается каждый фетчинг, в том числе при инвалидации (как правило GET)
     */
    isQueryFetching: boolean;
    constructor();
    get isIdle(): boolean;
    /**
     * Вызов был вызван, были завершены onSuccess / onError
     * Подойдет для большинства кейсов и будет работать правильнее. Вместо isQueryFullLoading / isQueryLoading
     */
    get isQueryNotReady(): boolean;
    /** Для работы с мутациями (Аналог useMutation) */
    fetchMutation: <TData = unknown, TVariables = unknown, TContext = unknown>(params: MutationObserverOptions<TData, ServerErrorResponse, TVariables, TContext>, options?: Partial<AsyncServiceMethodOptions>) => Promise<TData>;
    observer: QueryObserver<unknown, unknown, unknown, unknown, QueryKey>;
    /** Для работы query. (Аналог useQuery) */
    fetchQuery: <TQueryFnData = unknown, TData = TQueryFnData, TQueryData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(params: QueryObserverOptions<TQueryFnData, ServerErrorResponse, TData, TQueryData, TQueryKey>, options?: Partial<AsyncServiceMethodOptions>) => Promise<TData>;
    /** Для работы с бесконечной подрузкой данных (аналог useInfiniteQuery) */
    fetchInfiniteQuery: <TQueryFnData = unknown, TData = TQueryFnData, TQueryData = TQueryFnData>(params: InfiniteQueryObserverOptions<TQueryFnData, ServerErrorResponse, TData, TQueryData, QueryKey>, options?: Partial<AsyncServiceMethodOptions>) => InfiniteQueryObserver<TQueryFnData, ServerErrorResponse, TData, TQueryData>;
}
export {};
