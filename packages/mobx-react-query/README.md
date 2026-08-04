# @mobx-ecosystem/mobx-react-query

TanStack Query для сервисов на MobX — без React-хуков. Кэш, инвалидация и статусы
загрузки доступны из обычного класса, поэтому серверное состояние живёт в кэше,
а не копируется в поля сервиса.

## Установка

```bash
yarn add @mobx-ecosystem/mobx-react-query @tanstack/query-core mobx
```

Версии 4.x работают на `@tanstack/query-core` 5 и не требуют React.

## Настройка

Один раз при старте приложения:

```ts
import { configureMobxReactQuery } from '@mobx-ecosystem/mobx-react-query';
import { QueryClient } from '@tanstack/query-core';

configureMobxReactQuery({
  queryClient: new QueryClient({
    defaultOptions: {
      queries: {
        // Данные держим в памяти, чтобы при перезапросе они не пропадали:
        // сервисы читают их через computed, и пустой кэш означал бы undefined.
        gcTime: 5 * 60 * 1000,
        staleTime: 0,
        retry: false,
      },
    },
  }),

  onQueryError: showErrorToast,
  onMutationError: showErrorToast,

  // Необязательно: снимает конверт транспорта перед записью в кэш.
  unwrapQueryFnData: (res) => (isAxiosResponse(res) ? res.data : res),
});
```

## QueryService

Один экземпляр обслуживает один запрос. Данные читаются через `data`, а не
складываются в поле — иначе появится вторая копия серверного состояния.

```ts
export class UsersService {
  private queryService = new QueryService<IGetUsers>();

  constructor(private usersApi: UsersApi) {
    makeAutoObservable(this);
  }

  get users() {
    return this.queryService.data?.users ?? [];
  }

  get isLoading() {
    return this.queryService.isQueryLoading;
  }

  fetch = (params: IGetUsersParams) =>
    this.queryService.fetch({
      queryKey: UsersApi.keys.getUsers(params),
      queryFn: () => this.usersApi.getUsers(params),
    });

  reset = () => this.queryService.remove();
}
```

Начальное значение задаётся через `?? []`: до первого ответа `data` равен
`undefined`.

`QueryService` создаётся как обычный объект, поэтому его можно и внедрять
контейнером — библиотека про способ связывания ничего не знает. Важно одно:
один экземпляр на один запрос, иначе второй `fetch` перебьёт первый.

### Освобождение подписки

`fetch` подписывается на кэш и держит подписку, пока её не снимут. Если сервис
умрёт без `dispose`, подписка останется: запись в кэше не освободится сборщиком,
а обновления продолжат приходить в объект, который уже никому не нужен.

Сервис отдаёт наружу собственный `dispose`:

```ts
export class UsersService {
  private queryService = new QueryService<IGetUsers>();

  constructor(private usersApi: UsersApi) {
    makeAutoObservable(this);
  }

  fetch = (params: IGetUsersParams) =>
    this.queryService.fetch({
      queryKey: UsersApi.keys.getUsers(params),
      queryFn: () => this.usersApi.getUsers(params),
    });

  dispose = () => {
    this.queryService.dispose();
  };
}
```

Вызывается он там, где сервис перестаёт быть нужен. В React это размонтирование:

```tsx
const UsersList = observer(function UsersList() {
  const [service] = useState(() => new UsersService(usersApi));

  useEffect(() => {
    service.fetch({ page: 1 });

    return () => service.dispose();
  }, [service]);

  return <List items={service.users} isLoading={service.isLoading} />;
});
```

Сервис создаётся через `useState(() => ...)`, а не прямым `new` в теле: иначе на
каждый рендер будет новый экземпляр, а с ним новый запрос и новая подписка.

Если экземплярами управляет контейнер, `dispose` обычно зовёт он сам — тогда
достаточно зарегистрировать метод как деструктор скоупа.

### Методы

| Метод | Что делает |
|---|---|
| `fetch(params, options?)` | Запрашивает и подписывается. Промис завершается первым результатом |
| `setData(data, queryKey?)` | Кладёт данные в кэш без запроса |
| `remove()` | Убирает запись из кэша и сбрасывает `data` |
| `dispose()` | Отписывается; вызывается при уничтожении сервиса |

### Состояния

| Свойство | Когда `true` |
|---|---|
| `isQueryLoading` | идёт первая загрузка, данных ещё нет |
| `isQueryFetching` | идёт любой запрос, включая перезапрос по инвалидации |
| `isQueryInitialLoading` | первый запрос ещё не завершился, в том числе не начинался |

### options у fetch

```ts
this.queryService.fetch(params, { hasToast: false, rejectable: true });
```

`hasToast` — звать ли общий `onQueryError`. `rejectable` — реджектить промис при
ошибке или резолвить `undefined`. Промис завершается в обоих случаях.

## Данные от мутации

Ответ мутации часто уже содержит свежую сущность — перезапрашивать её незачем:

```ts
receive = (user: IGetUser) => {
  this.queryService.setData(user);
};
```

`queryKey` нужен, когда `fetch` на этом сервисе ещё не звали — например, сущность
только что создали. Тогда сервис заодно начинает следить за этим ключом:

```ts
receive = (user: IGetUser) => {
  this.queryService.setData(user, UsersApi.keys.getUserById(user.id));
};
```

Правило простое: **если сервис может получить данные до первого запроса — ключ
передавайте всегда.** Забыть не страшно, `setData` бросит ошибку, а не промолчит.

Ключ удобно строить одним методом, чтобы `fetch` и `setData` не разъезжались:

```ts
export class UserService {
  private queryService = new QueryService<IGetUser>();

  constructor(private usersApi: UsersApi) {
    makeAutoObservable(this);
  }

  private keyOf = (id: number) => UsersApi.keys.getUserById(id);

  fetch = (id: number) =>
    this.queryService.fetch({
      queryKey: this.keyOf(id),
      queryFn: () => this.usersApi.getUserById(id),
    });

  receive = (user: IGetUser) =>
    this.queryService.setData(user, this.keyOf(user.id));
}
```

## MutationService

```ts
export class RemoveUserService {
  private mutationService = new MutationService();

  constructor(
    private usersApi: UsersApi,
    private usersService: UsersService,
  ) {
    makeAutoObservable(this);
  }

  get isLoading() {
    return this.mutationService.isMutationLoading;
  }

  remove = (id: number) =>
    this.mutationService.fetch({
      mutationFn: () => this.usersApi.removeUser(id),
      onSuccess: ({ data }) => {
        this.usersService.receive(data);
      },
    });
}
```

У мутаций `onSuccess` и `onError` сохранены: мутация — это действие с чётким
моментом, в отличие от запроса, который подписан на состояние кэша.
`unwrapQueryFnData` на мутации не действует — ответ приходит целиком, вместе с
заголовками.

## Глаголы работы с данными

- `fetch` — сходить на сервер и положить в кэш
- `setData` — принять готовую сущность, без запроса
- `invalidate` — пометить протухшим, чтобы данные перезапросились
- `remove` — убрать из кэша

`set*` для записи в кэш лучше не использовать: обычно так называют запись в
локальное поле, а тут значение видят все подписчики.

## Обновление с 3.x

- зависимость `@tanstack/react-query` заменена на `@tanstack/query-core` 5;
- у запросов больше нет `onSuccess` и `onError` — их убрал TanStack Query 5.
  Данные читаются через `data`, ошибки — через `try/catch` вокруг `await` или
  через общий `onQueryError`;
- `cacheTime` переименован в `gcTime`;
- `unwrapQueryData` заменён на `unwrapQueryFnData`: разворот перенесён с чтения
  на запись, поэтому в кэше лежат предметные данные;
- `isQueryFullLoading` переименован в `isQueryInitialLoading`;
- `setSettings` удалён: он всегда выставлял `true` независимо от аргумента;
- `InfiniteQueryService` удалён.
