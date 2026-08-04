import { describe, expect, it, jest } from "@jest/globals";
import { QueryClient } from "@tanstack/query-core";
import { configureMobxReactQuery } from "./config";
import { MutationService } from "./mutation-service";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const setup = (onMutationError?: (error: unknown) => void) => {
  configureMobxReactQuery({
    queryClient: new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    }),
    onMutationError,
    // Мутациям конверт нужен: из заголовков берут retry-after и имя файла.
    unwrapQueryFnData: (raw) => (raw as { data?: unknown })?.data,
  });
};

describe("MutationService", () => {
  describe("fetch", () => {
    it("успех -> промис резолвится ответом", async () => {
      setup();

      const mutationFn = jest
        .fn<() => Promise<string>>()
        .mockResolvedValue("done");

      const result = await new MutationService().fetch({ mutationFn });

      expect(mutationFn).toHaveBeenCalledTimes(1);
      expect(result).toBe("done");
    });

    it("успех -> onSuccess получает ответ", async () => {
      setup();

      const onSuccess = jest.fn<(data: string) => void>();

      await new MutationService().fetch({
        mutationFn: async () => "done",
        onSuccess,
      });
      await flush();

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess.mock.calls[0][0]).toBe("done");
    });

    it("ответ не разворачивается: конверт нужен мутациям целиком", async () => {
      setup();

      const envelope = { data: "payload", status: 200, headers: {} };

      const result = await new MutationService().fetch({
        mutationFn: async () => envelope,
      });

      expect(result).toBe(envelope);
    });

    it("ошибка при rejectable: false -> промис завершается, а не виснет", async () => {
      setup();

      const result = await new MutationService().fetch(
        {
          mutationFn: async () => {
            throw new Error("boom");
          },
        },
        { hasToast: false, rejectable: false },
      );

      expect(result).toBeUndefined();
    });

    it("ошибка при rejectable: true -> промис реджектится тем же объектом", async () => {
      setup();

      const error = Object.assign(new Error("boom"), {
        response: { status: 409, data: { message: "конфликт" } },
      });

      await expect(
        new MutationService().fetch(
          {
            mutationFn: async () => {
              throw error;
            },
          },
          { hasToast: false, rejectable: true },
        ),
      ).rejects.toBe(error);
    });

    it("ошибка -> onError получает ошибку", async () => {
      setup();

      const error = new Error("boom");
      const onError = jest.fn<(error: unknown) => void>();

      await new MutationService().fetch(
        {
          mutationFn: async () => {
            throw error;
          },
          onError,
        },
        { hasToast: false, rejectable: false },
      );
      await flush();

      expect(onError.mock.calls[0][0]).toBe(error);
    });

    it("hasToast: true -> зовёт общий обработчик ошибок", async () => {
      const onMutationError = jest.fn<(error: unknown) => void>();
      setup(onMutationError);

      await new MutationService().fetch(
        {
          mutationFn: async () => {
            throw new Error("boom");
          },
        },
        { hasToast: true, rejectable: false },
      );
      await flush();

      expect(onMutationError).toHaveBeenCalledTimes(1);
    });

    it("hasToast: false -> общий обработчик не зовётся", async () => {
      const onMutationError = jest.fn<(error: unknown) => void>();
      setup(onMutationError);

      await new MutationService().fetch(
        {
          mutationFn: async () => {
            throw new Error("boom");
          },
        },
        { hasToast: false, rejectable: false },
      );
      await flush();

      expect(onMutationError).not.toHaveBeenCalled();
    });
  });

  describe("состояния загрузки", () => {
    it("во время мутации isMutationLoading -> true, после -> false", async () => {
      setup();

      const service = new MutationService();
      const pending = service.fetch({
        mutationFn: async () => {
          await flush();

          return "done";
        },
      });

      await flush();
      expect(service.isMutationLoading).toBe(true);

      await pending;
      await flush();

      expect(service.isMutationLoading).toBe(false);
    });

    it("isMutationFullLoading выключается после onSuccess", async () => {
      setup();

      const service = new MutationService();

      expect(service.isMutationFullLoading).toBe(false);

      await service.fetch({ mutationFn: async () => "done" });

      expect(service.isMutationFullLoading).toBe(false);
    });
  });
});
