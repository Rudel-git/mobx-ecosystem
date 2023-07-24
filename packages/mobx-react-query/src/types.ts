import { QueryClient } from "@tanstack/react-query";

export type OnErrorCallback = ((error: ServerError) => void) | undefined;

export interface MobxReactQueryConfiguration {
  queryClient?: QueryClient;

  /** Удобно класть общую обработку ошибок. Например тосты */
  onQueryError?: OnErrorCallback;

  /** Удобно класть общую обработку ошибок. Например тосты */
  onInfiniteQueryError?: OnErrorCallback;

  /** Удобно класть общую обработку ошибок. Например тосты */
  onMutationError?: OnErrorCallback;
}

/***
 * rejectable - выключает reject ошибок, в onError, onSettled все еще будет приходить
 */
export type AsyncServiceMethodOptions =
  | { hasToast: boolean; rejectable: boolean }
  | undefined;

export type ServerErrorResponse = Record<string, any>;
export type ServerError = ServerErrorResponse;