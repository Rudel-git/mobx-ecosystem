import { QueryClient } from "@tanstack/query-core";

export type OnErrorCallback = ((error: ServerError) => void) | undefined;

export interface MobxReactQueryConfiguration {
  queryClient?: QueryClient;

  /** Удобно класть общую обработку ошибок. Например тосты */
  onQueryError?: OnErrorCallback;

  /** Удобно класть общую обработку ошибок. Например тосты */
  onMutationError?: OnErrorCallback;

  /**
   * Разворачивает результат queryFn перед тем, как он попадёт в кэш.
   * Например, для axios: (res) => res?.data — тогда в кэше лежат предметные
   * данные, а не HTTP-конверт. Ошибки идут мимо: они бросаются, а не возвращаются.
   * Мутаций не касается.
   */
  unwrapQueryFnData?: UnwrapQueryFnData;
}

export type UnwrapQueryFnData = ((raw: unknown) => unknown) | undefined;

/***
 * rejectable - выключает reject ошибок, в onError, onSettled все еще будет приходить
 */
export type AsyncServiceMethodOptions =
  | { hasToast: boolean; rejectable: boolean }
  | undefined;

export type ServerErrorResponse = Record<string, any>;
export type ServerError = ServerErrorResponse;