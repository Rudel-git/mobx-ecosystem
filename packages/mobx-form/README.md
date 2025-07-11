## Installation
```bash
npm install @mobx-ecosystem/mobx-form mobx


yarn add @mobx-ecosystem/mobx-form mobx


Работа с формой

field1 = new FieldService('');
field2 = new FieldService('');
field 3 = new FieldService(null);

formService = new FormService({
field1: this.field1,
field2: this.field2,
field3: this.field3
})

// 1 кейс
this.formService.setInitValues({
field1: 'TEST',
field2: undefined,
field3: null
})

// 2 кейс
this.formService.setInitValues({
field1: 'TEST',
field3: null
})

// 3 кейс
this.formService.setValues({
field1: 'TEST',
field3: null
})
```