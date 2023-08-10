import { QueryClient } from "@tanstack/react-query";
import { MobxReactQueryConfiguration, OnErrorCallback } from "./types";

export const DEFAULT_METHOD_OPTIONS = {
  hasToast: true,
  rejectable: true,
}

export let queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 300 * 1000, // сброс кэша каждые 5 мин
      retry: false, // без попыток повторить запрос, если пришел с ошибкой
      refetchOnWindowFocus: false,
    },
  },
});

export let onQueryError: OnErrorCallback;
export let onInfiniteQueryError: OnErrorCallback;
export let onMutationError: OnErrorCallback;

export const configureMobxReactQuery = (options: MobxReactQueryConfiguration) => {
  if (options?.queryClient) {
    queryClient = options?.queryClient;
  }

  if (options?.onQueryError) {
    onQueryError = options?.onQueryError;
  }

  if (options?.onInfiniteQueryError) {
    onInfiniteQueryError = options?.onInfiniteQueryError;
  }

  if (options?.onMutationError) {
    onMutationError = options?.onMutationError;
  }
}