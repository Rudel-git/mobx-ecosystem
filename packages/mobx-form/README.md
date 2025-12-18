## Installation
```bash
npm install @mobx-ecosystem/mobx-form mobx
yarn add @mobx-ecosystem/mobx-form mobx

Работа с формой
FieldService - подходит для полей: input, files, checkbox, radiobox, select
AutocompleteFieldService - подходит для autocomplete поля

Создание:
Самая тривиальная форма. Без каких-либо подписок, без сложных полей
class UserService {
  // Если данные могут приходить с сервера, то тут достаточно указать пустое значение в соответствии с типом поля.
  // Например у строки это '', у Autocomplete это null, у Checkbox это обычно false
  nameField = new FieldService('');
  countryField = new AutocompleteFieldService(null);

  // Регистрация в форме
  formService = new FormService({
    name: this.nameField,
    country: this.countryField,
  })

  constructor() {
    makeAutoObservable(this);
  }

  // Начальная инициализация (обычно нужно для данных с сервера, чтобы вставить в форму)
  init = () => {
    const data = await fetch(`/api/user/${50}`);

    // Тут стоит отметить, если по какой-то причине с сервера придет пустое значение (null). То setInitValues автоматически выставит правильное "пустое значение".
    // В случае со строкой вместо null будет ''
    this.formService.setInitValues({
      name: data.name,
      country: data.country,
    })
  }

  // берем данные из формы и сохраняем на сервере
  getBody = () => {
    const { name, country } = this.formService.getValues();

    await fetch(`/api/user/${50}`, { name, country });
    // тут может быть 3 варианта:
    // - мы можем дернуть запрос на get, чтобы удостовериться в правильности и снова вызвать this.init();
    // - бэк может прислать нам в ответе выставленные данные => мы можем заново сделать setInitValues
    // - мы можем просто посмотреть на статус 200. В таком случае условно считаем, что сохранение удачное
    // Я предпочитаю 1 и 2 варианты они дают более надежные. Но всегда есть риск ошибки на бэке
  }
}

