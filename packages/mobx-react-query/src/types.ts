import { QueryClient } from "@tanstack/react-query";

export type OnErrorCallback = ((error: ServerError) => void) | undefined;

export interface MobxReactQueryConfiguration {
  queryClient?: QueryClient;

  /** Удобно класть общую обработку ошибок. Например тосты */
  onQueryError?: OnErrorCallback;

  /** Удобно класть общую обработку ошибок. Например тосты */
  onMutationError?: OnErrorCallback;

  /**
   * Разворачивает ответ транспорта перед отдачей в QueryService.data.
   * Например, для axios: (res) => res?.data — чтобы сервисы не знали про конверт.
   * На onSuccess и результат fetch не влияет.
   */
  unwrapQueryData?: UnwrapQueryData;
}

export type UnwrapQueryData = ((raw: unknown) => unknown) | undefined;

/***
 * rejectable - выключает reject ошибок, в onError, onSettled все еще будет приходить
 */
export type AsyncServiceMethodOptions =
  | { hasToast: boolean; rejectable: boolean }
  | undefined;

export type ServerErrorResponse = Record<string, any>;
export type ServerError = ServerErrorResponse;