import { describe, expect, it, jest } from "@jest/globals";
import { QueryClient } from "@tanstack/query-core";
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
    it("без кэша -> запрос один раз, промис резолвится данными", async () => {
      setupClient(0);

      const queryFn = jest
        .fn<() => Promise<string>>()
        .mockResolvedValue("first");

      const result = await new QueryService().fetch({
        queryKey: ["k"],
        queryFn,
      });
      await flush();

      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(result).toBe("first");
    });

    it("данные протухли -> запрос повторяется, приходят новые", async () => {
      setupClient(0);

      const queryFn = jest
        .fn<() => Promise<string>>()
        .mockResolvedValueOnce("stale")
        .mockResolvedValueOnce("fresh");

      await new QueryService().fetch({ queryKey: ["k"], queryFn });
      await flush();

      const result = await new QueryService().fetch({ queryKey: ["k"], queryFn });
      await flush();

      expect(queryFn).toHaveBeenCalledTimes(2);
      expect(result).toBe("fresh");
    });

    it("данные свежие -> запроса нет, промис резолвится кэшем", async () => {
      setupClient(60_000);

      const queryFn = jest
        .fn<() => Promise<string>>()
        .mockResolvedValue("cached");

      await new QueryService().fetch({ queryKey: ["k"], queryFn });
      await flush();

      const result = await new QueryService().fetch({ queryKey: ["k"], queryFn });
      await flush();

      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(result).toBe("cached");
    });

    it("ошибка при rejectable: false -> промис завершается, а не виснет", async () => {
      setupClient(0);

      const queryFn = jest
        .fn<() => Promise<string>>()
        .mockRejectedValue(new Error("boom"));

      const result = await new QueryService().fetch(
        { queryKey: ["err"], queryFn },
        { hasToast: false, rejectable: false },
      );

      expect(result).toBeUndefined();
    });

    it("ошибка при rejectable: true -> промис реджектится", async () => {
      setupClient(0);

      const error = new Error("boom");
      const queryFn = jest.fn<() => Promise<string>>().mockRejectedValue(error);

      await expect(
        new QueryService().fetch(
          { queryKey: ["err-reject"], queryFn },
          { hasToast: false, rejectable: true },
        ),
      ).rejects.toBe(error);
    });
  });

  describe("isQueryInitialLoading", () => {
    it("до первого fetch -> true, а isQueryLoading -> false", () => {
      setupClient(0);

      const service = new QueryService();

      // ради этого флаг и нужен: лоадер на старте, пока запрос не начался
      expect(service.isQueryInitialLoading).toBe(true);
      expect(service.isQueryLoading).toBe(false);
    });

    it("после успешного запроса -> false", async () => {
      setupClient(0);

      const service = new QueryService<string>();

      await service.fetch({
        queryKey: ["init-ok"],
        queryFn: async () => "done",
      });

      expect(service.isQueryInitialLoading).toBe(false);
    });

    it("после ошибки -> false, лоадер не залипает", async () => {
      setupClient(0);

      const service = new QueryService<string>();

      await service.fetch(
        {
          queryKey: ["init-err"],
          queryFn: async () => {
            throw new Error("boom");
          },
        },
        { hasToast: false, rejectable: false },
      );

      expect(service.isQueryInitialLoading).toBe(false);
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

    it("результат fetch — уже развёрнутый", async () => {
      setupClient(0);
      configureMobxReactQuery({
        unwrapQueryFnData: (raw) => (raw as { data?: unknown })?.data,
      });

      const result = await new QueryService().fetch({
        queryKey: ["uw-callback"],
        queryFn: async () => axiosLike("payload"),
      });
      await flush();

      expect(result).toBe("payload");
    });

    it("ошибка доезжает целиком: распаковка её не трогает", async () => {
      setupClient(0);
      configureMobxReactQuery({
        unwrapQueryFnData: (raw) => (raw as { data?: unknown })?.data,
      });

      const error = Object.assign(new Error("boom"), {
        response: { status: 404, data: { message: "нет такого" } },
      });

      await expect(
        new QueryService().fetch(
          {
            queryKey: ["uw-error"],
            queryFn: async () => {
              throw error;
            },
          },
          { hasToast: false, rejectable: true },
        ),
      ).rejects.toBe(error);
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

    it("до запроса без ключа -> внятная ошибка, а не тишина", () => {
      setupClient(0);

      expect(() => new QueryService<string>().setData("x")).toThrow(
        /queryKey/,
      );
    });

    it("запроса не было -> setData с ключом делает data читаемым", async () => {
      setupClient(0);

      const service = new QueryService<{ id: number }>();

      // сущность только что создали: fetch по ней не делали ни разу
      service.setData({ id: 7 }, ["entity", 7]);
      await flush();

      expect(service.data).toEqual({ id: 7 });
      expect(service.queryClient.getQueryData(["entity", 7])).toEqual({ id: 7 });
    });

    it("после setData с ключом данные обновляются повторно", async () => {
      setupClient(0);

      const service = new QueryService<{ id: number }>();

      service.setData({ id: 1 }, ["entity", 1]);
      await flush();

      service.setData({ id: 2 });
      await flush();

      expect(service.data).toEqual({ id: 2 });
    });

    it("запрос уже был -> ключ не нужен", async () => {
      setupClient(60_000);
      configureMobxReactQuery({ unwrapQueryFnData: undefined });

      const service = new QueryService<string>();

      await service.fetch({
        queryKey: ["existing"],
        queryFn: async () => "first",
      });
      await flush();

      service.setData("second");
      await flush();

      expect(service.data).toBe("second");
    });
  });
});
