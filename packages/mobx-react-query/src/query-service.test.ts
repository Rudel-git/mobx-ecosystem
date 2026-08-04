import { describe, expect, it, jest } from "@jest/globals";
import { QueryClient } from "@tanstack/react-query";
import { configureMobxReactQuery } from "./config";
import { QueryService } from "./query-service";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const setupClient = (staleTime: number) => {
  configureMobxReactQuery({
    queryClient: new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime } },
    }),
  });
};

describe("QueryService", () => {
  describe("fetch", () => {
    it("без кэша -> onSuccess вызывается один раз", async () => {
      setupClient(0);

      const onSuccess = jest.fn<(data: unknown) => void>();
      const queryFn = jest.fn<() => Promise<string>>().mockResolvedValue("first");

      await new QueryService().fetch({ queryKey: ["k"], queryFn, onSuccess });
      await flush();

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it("кэш есть, но данные протухли -> onSuccess один раз, и с новыми данными", async () => {
      setupClient(0);

      const queryFn = jest
        .fn<() => Promise<string>>()
        .mockResolvedValueOnce("stale")
        .mockResolvedValueOnce("fresh");

      await new QueryService().fetch({ queryKey: ["k"], queryFn });

      const onSuccess = jest.fn<(data: unknown) => void>();

      await new QueryService().fetch({ queryKey: ["k"], queryFn, onSuccess });
      await flush();

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith("fresh");
    });

    it("данные свежие -> запрос не повторяется, onSuccess один раз", async () => {
      setupClient(60_000);

      const queryFn = jest.fn<() => Promise<string>>().mockResolvedValue("cached");

      await new QueryService().fetch({ queryKey: ["k"], queryFn });

      const onSuccess = jest.fn<(data: unknown) => void>();

      await new QueryService().fetch({ queryKey: ["k"], queryFn, onSuccess });
      await flush();

      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith("cached");
    });

    it("ошибка при rejectable: false -> промис завершается, а не виснет", async () => {
      setupClient(0);

      const queryFn = jest.fn<() => Promise<string>>().mockRejectedValue(new Error("boom"));

      const result = await new QueryService().fetch(
        { queryKey: ["err"], queryFn },
        { hasToast: false, rejectable: false },
      );

      expect(result).toBeUndefined();
    });
  });

  describe("data", () => {
    it("до запроса -> undefined", () => {
      setupClient(0);

      expect(new QueryService().data).toBeUndefined();
    });

    it("после успеха -> данные запроса", async () => {
      setupClient(0);

      const service = new QueryService<string>();
      const queryFn = jest.fn<() => Promise<string>>().mockResolvedValue("value");

      await service.fetch({ queryKey: ["data"], queryFn });
      await flush();

      expect(service.data).toBe("value");
    });

    it("после инвалидации -> новые данные без onSuccess", async () => {
      setupClient(0);

      const service = new QueryService<string>();
      const queryFn = jest
        .fn<() => Promise<string>>()
        .mockResolvedValueOnce("first")
        .mockResolvedValueOnce("second");

      await service.fetch({ queryKey: ["inv"], queryFn });
      await flush();
      expect(service.data).toBe("first");

      await service.queryClient.invalidateQueries({ queryKey: ["inv"] });
      await flush();

      expect(queryFn).toHaveBeenCalledTimes(2);
      expect(service.data).toBe("second");
    });
  });

  describe("remove", () => {
    it("удаляет запись из кэша, следующий запрос идёт на сервер", async () => {
      setupClient(60_000);

      const queryFn = jest.fn<() => Promise<string>>().mockResolvedValue("cached");

      const first = new QueryService<string>();
      await first.fetch({ queryKey: ["rm"], queryFn });
      await flush();

      first.remove();
      first.dispose();

      await new QueryService<string>().fetch({ queryKey: ["rm"], queryFn });
      await flush();

      // без remove данные взялись бы из кэша и второго запроса не было бы
      expect(queryFn).toHaveBeenCalledTimes(2);
    });

    it("до запроса ничего не делает и не падает", () => {
      setupClient(0);

      expect(() => new QueryService().remove()).not.toThrow();
    });

    it("при живой подписке не провоцирует повторный запрос", async () => {
      setupClient(60_000);

      const service = new QueryService<string>();
      const queryFn = jest.fn<() => Promise<string>>().mockResolvedValue("value");

      await service.fetch({ queryKey: ["rm-live"], queryFn });
      await flush();

      service.remove();
      await flush();

      expect(queryFn).toHaveBeenCalledTimes(1);
    });

    it("сбрасывает data, как того ждёт reset() в сервисах", async () => {
      setupClient(60_000);

      const service = new QueryService<string>();
      const queryFn = jest.fn<() => Promise<string>>().mockResolvedValue("value");

      await service.fetch({ queryKey: ["rm-data"], queryFn });
      await flush();
      expect(service.data).toBe("value");

      service.remove();
      await flush();

      expect(service.data).toBeUndefined();
    });
  });

  describe("unwrapQueryFnData", () => {
    const axiosLike = <T>(data: T) => ({
      data,
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    });

    it("не задан -> в кэше лежит то, что вернул queryFn", async () => {
      setupClient(0);
      configureMobxReactQuery({ unwrapQueryFnData: undefined });

      const service = new QueryService<{ data: string }>();

      await service.fetch({
        queryKey: ["uw-off"],
        queryFn: async () => axiosLike("payload"),
      });
      await flush();

      expect(service.data).toMatchObject({ data: "payload" });
    });

    it("задан -> в кэш попадают предметные данные, без конверта", async () => {
      setupClient(0);
      configureMobxReactQuery({
        unwrapQueryFnData: (raw) => (raw as { data?: unknown })?.data,
      });

      const service = new QueryService<string>();

      await service.fetch({
        queryKey: ["uw-on"],
        queryFn: async () => axiosLike("payload"),
      });
      await flush();

      expect(service.data).toBe("payload");
      expect(service.queryClient.getQueryData(["uw-on"])).toBe("payload");
    });

    it("onSuccess и результат fetch получают уже развёрнутое", async () => {
      setupClient(0);
      configureMobxReactQuery({
        unwrapQueryFnData: (raw) => (raw as { data?: unknown })?.data,
      });

      const onSuccess = jest.fn<(data: unknown) => void>();

      const result = await new QueryService().fetch({
        queryKey: ["uw-callback"],
        queryFn: async () => axiosLike("payload"),
        onSuccess,
      });
      await flush();

      expect(result).toBe("payload");
      expect(onSuccess).toHaveBeenCalledWith("payload");
    });

    it("ошибка доезжает целиком: распаковка её не трогает", async () => {
      setupClient(0);
      configureMobxReactQuery({
        unwrapQueryFnData: (raw) => (raw as { data?: unknown })?.data,
      });

      const error = Object.assign(new Error("boom"), {
        response: { status: 404, data: { message: "нет такого" } },
      });

      const onError = jest.fn<(e: unknown) => void>();

      await new QueryService()
        .fetch(
          {
            queryKey: ["uw-error"],
            queryFn: async () => {
              throw error;
            },
            onError,
          },
          { hasToast: false, rejectable: false },
        )
        .catch(() => undefined);
      await flush();

      expect(onError).toHaveBeenCalledWith(error);
      expect(onError.mock.calls[0][0]).toBe(error);
    });
  });

  describe("setData", () => {
    it("кладёт предметные данные, их видит data", async () => {
      setupClient(60_000);
      configureMobxReactQuery({
        unwrapQueryFnData: (raw) => (raw as { data?: unknown })?.data,
      });

      const service = new QueryService<string>();
      const queryFn = jest
        .fn<() => Promise<{ data: string }>>()
        .mockResolvedValue({ data: "first" });

      await service.fetch({ queryKey: ["set"], queryFn });
      await flush();
      expect(service.data).toBe("first");

      service.setData("second");
      await flush();

      expect(service.data).toBe("second");
      expect(queryFn).toHaveBeenCalledTimes(1);
    });

    it("до запроса ничего не делает и не падает", () => {
      setupClient(0);

      expect(() => new QueryService<string>().setData("x")).not.toThrow();
    });
  });
});
