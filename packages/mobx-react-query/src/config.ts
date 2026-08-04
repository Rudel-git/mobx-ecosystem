import { QueryClient } from "@tanstack/react-query";
import { MobxReactQueryConfiguration, OnErrorCallback, UnwrapQueryData } from "./types";

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
export let onMutationError: OnErrorCallback;
export let unwrapQueryData: UnwrapQueryData;

export const configureMobxReactQuery = (options: MobxReactQueryConfiguration) => {
  if (options?.queryClient) {
    queryClient = options?.queryClient;
  }

  if (options?.onQueryError) {
    onQueryError = options?.onQueryError;
  }

  if (options?.onMutationError) {
    onMutationError = options?.onMutationError;
  }

  // Проверяем наличие ключа, а не значение: так распаковку можно и снять,
  // передав undefined. Нужно, чтобы конфиг не залипал между тестами.
  if (options && "unwrapQueryData" in options) {
    unwrapQueryData = options.unwrapQueryData;
  }
}