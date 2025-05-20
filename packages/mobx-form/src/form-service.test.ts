import {describe, expect, test, beforeEach} from '@jest/globals';

import { CombinedFormFieldService } from "./combined-form-field-service";
import { FieldService } from "./field-service";
import { FormService } from "./form-service";
import { makeAutoObservable } from "mobx";
import { configureForm } from './configure-form';
import { AutocompleteFieldService } from './autocompete-field-service';
import { FormServiceValuesType, IFormable } from './types';

const ERROR_TEMPLATE = "field error";
const FIELD_VALUE_TEMPLATE = "field value";
const AUTOCOMPLETE_FIELD_VALUE_TEMPLATE = { id: 1, title: 'first item' }

let formService: FormService<{
  field: FieldService<string>
  autoCompleteField: AutocompleteFieldService<{ id: number, title: string }>
  combinedFormFieldService: CombinedFormFieldService
  withFormService: CombinedField;
}>;

class CombinedField {
  field = new FieldService("");
  
  formService = new FormService({
    field: this.field,
  })

   constructor() {
    makeAutoObservable(this);
  }
}

beforeEach(() => {

  configureForm({
    validation: {
      validate: (fieldValues: Record<string, unknown>, validationSchema: unknown) => {
        return new Promise(resolve => resolve({ field: 'error' }))
      },
      preSubmitValidationError: () => {
        // test
      }
    }
    
  })


  formService = new FormService({
    field: new FieldService(""),
    autoCompleteField: new AutocompleteFieldService<{ id: number, title: string }>(null),
    combinedFormFieldService: new CombinedFormFieldService<IFormable<FormServiceValuesType>>([
     new CombinedField(), new CombinedField()
    ]),
    withFormService: new CombinedField()
  })
});

describe('form-service', () => {
  test('vallidate "everything" form', async () => {
    await formService.validate('everything');

    expect(formService.canBeSubmitted).toBeFalsy()
    expect(formService.isTouched).toBeFalsy()
    expect(formService.isValid).toBeFalsy()
    expect(formService.canBeSubmitted).toBeFalsy()

    expect(formService.fields.field.isValid).toBeFalsy()
    expect(formService.fields.autoCompleteField.isValid).toBeTruthy()
    expect(formService.fields.withFormService.formService.isValid).toBeTruthy()
    expect(formService.fields.combinedFormFieldService.isValid).toBeFalsy()
    expect(formService.fields.combinedFormFieldService.value.some(it => it.formService.isValid)).toBeFalsy()
  });

  test('vallidate "touched" form', async () => {
    formService.fields.field.touch();

    await formService.validate('only-touched');

    expect(formService.fields.field.isValid).toBeFalsy()
    expect(formService.fields.autoCompleteField.isValid).toBeTruthy()
  });

  test('touch form', async () => {    
    formService.touch();
   
    expect(formService.isTouched).toBeTruthy();
    expect(formService.fields.field.isTouched).toBeTruthy();
    expect(formService.fields.autoCompleteField.isTouched).toBeTruthy();
    expect(formService.fields.combinedFormFieldService.isTouched).toBeTruthy();
    expect(formService.fields.combinedFormFieldService.value.every(it => it.formService.isTouched)).toBeTruthy()
  });

  test('disable form', () => {
    formService.disable();
    
    expect(formService.disabled).toBeTruthy();
    expect(formService.fields.field.disabled).toBeTruthy();
    expect(formService.fields.autoCompleteField.disabled).toBeTruthy();
    expect(formService.fields.combinedFormFieldService.disabled).toBeTruthy();
    expect(formService.fields.combinedFormFieldService.value.every(it => it.formService.disabled)).toBeTruthy()
  })

  test('enable form', () => {
    formService.enable();
    
    expect(formService.disabled).toBeFalsy();
    expect(formService.fields.field.disabled).toBeFalsy();
    expect(formService.fields.autoCompleteField.disabled).toBeFalsy();
    expect(formService.fields.combinedFormFieldService.disabled).toBeFalsy();
    expect(formService.fields.combinedFormFieldService.value.every(it => it.formService.disabled)).toBeFalsy()
  })

  test('set errors with "everything" validation type ', () => {
    formService.setErrors({
      field: ERROR_TEMPLATE,
      autoCompleteField: ERROR_TEMPLATE,
      combinedFormFieldService: ERROR_TEMPLATE
    }, 'everything');

    const fields = formService.fields;

    // fields.combinedFormFieldService.value.forEach(it => it.formService.setErrors({ field: ERROR_TEMPLATE }, 'everything'))
    
    expect(fields.field.error).toEqual(ERROR_TEMPLATE);
    expect(fields.autoCompleteField.error).toEqual(ERROR_TEMPLATE);
    expect(fields.combinedFormFieldService.error).toEqual(ERROR_TEMPLATE);

    // fields.combinedFormFieldService.value.forEach(it => expect(it.formService.fields.field.error).toEqual(ERROR_TEMPLATE))
  })


  test('resetErrors form ', () => {
    const fields = formService.fields;

    formService.setErrors({
      field: ERROR_TEMPLATE,
      autoCompleteField: ERROR_TEMPLATE,
      combinedFormFieldService: ERROR_TEMPLATE
    }, 'everything');

    formService.resetErrors();
    
    expect(fields.field.error).toBeUndefined()
    expect(fields.autoCompleteField.error).toBeUndefined()
    // fields.combinedFormFieldService.value.forEach(it => expect(it.formService.fields.field.error).toBeUndefined())
  })

  test('setValues form ', () => {
    const fields = formService.fields;

    formService.setValues({
      field: FIELD_VALUE_TEMPLATE,
      autoCompleteField: AUTOCOMPLETE_FIELD_VALUE_TEMPLATE,
      combinedFormFieldService: fields.combinedFormFieldService.value
    });

    // fields.combinedFormFieldService.value.forEach(it => it.formService.setValues({ field: FIELD_VALUE_TEMPLATE }))
    
    expect(fields.field.value).toEqual(FIELD_VALUE_TEMPLATE);
    expect(fields.autoCompleteField.value).toEqual(AUTOCOMPLETE_FIELD_VALUE_TEMPLATE);

    // fields.combinedFormFieldService.value.forEach(it => expect(it.formService.fields.field.value).toEqual(FIELD_VALUE_TEMPLATE))
  })

  test('setInitValues form ', () => {
    const fields = formService.fields;

    formService.setInitValues({
      field: FIELD_VALUE_TEMPLATE,
      autoCompleteField: AUTOCOMPLETE_FIELD_VALUE_TEMPLATE,
      combinedFormFieldService: fields.combinedFormFieldService.value
    });

    // fields.combinedFormFieldService.value.forEach(it => it.formService.setInitValues({ field: FIELD_VALUE_TEMPLATE }))
    
    expect(fields.field.initValue).toEqual(FIELD_VALUE_TEMPLATE);
    expect(fields.field.value).toEqual(FIELD_VALUE_TEMPLATE);

    expect(fields.autoCompleteField.initValue).toEqual(AUTOCOMPLETE_FIELD_VALUE_TEMPLATE);
    expect(fields.autoCompleteField.value).toEqual(AUTOCOMPLETE_FIELD_VALUE_TEMPLATE);

    // fields.combinedFormFieldService.value.forEach(it => expect(it.formService.fields.field.initValue).toEqual(FIELD_VALUE_TEMPLATE))
    // fields.combinedFormFieldService.value.forEach(it => expect(it.formService.fields.field.value).toEqual(FIELD_VALUE_TEMPLATE))
  })

  test('reset form', () => {
    const fields = formService.fields;

    expect(fields.field.initValue).toEqual(fields.field.value);
    expect(fields.autoCompleteField.initValue).toEqual(fields.autoCompleteField.value);
    // fields.combinedFormFieldService.value.forEach(it => expect(it.formService.fields.field.initValue).toEqual(it.formService.fields.field.value))

    formService.setValues({
      field: FIELD_VALUE_TEMPLATE,
      autoCompleteField: AUTOCOMPLETE_FIELD_VALUE_TEMPLATE,
      combinedFormFieldService: fields.combinedFormFieldService.value
    });

    // fields.combinedFormFieldService.value.forEach(it => it.formService.setValues({ field: FIELD_VALUE_TEMPLATE }))

    expect(fields.field.initValue).not.toEqual(fields.field.value);
    expect(fields.autoCompleteField.initValue).not.toEqual(fields.autoCompleteField.value);
    // fields.combinedFormFieldService.value.forEach(it => expect(it.formService.fields.field.initValue).not.toEqual(it.formService.fields.field.value))
  })

  test('set values as init form', () => {
    const fields = formService.fields;

    formService.setValues({
      field: FIELD_VALUE_TEMPLATE,
      autoCompleteField: AUTOCOMPLETE_FIELD_VALUE_TEMPLATE,
      combinedFormFieldService: fields.combinedFormFieldService.value
    });

    // fields.combinedFormFieldService.value.forEach(it => it.formService.setValues({ field: FIELD_VALUE_TEMPLATE }))

    formService.setAsInit();

    expect(fields.field.initValue).toEqual(fields.field.value);
    expect(fields.autoCompleteField.initValue).toEqual(fields.autoCompleteField.value);
    // fields.combinedFormFieldService.value.forEach(it => expect(it.formService.fields.field.initValue).toEqual(it.formService.fields.field.value))
  })

  test('reset form with certain fields', () => {
    const fields = formService.fields;

    try {
      expect(fields.field.initValue).toEqual(fields.field.value);
      expect(fields.autoCompleteField.initValue).toEqual(fields.autoCompleteField.value);
  
      
      formService.setValues({
        field: FIELD_VALUE_TEMPLATE,
        autoCompleteField: AUTOCOMPLETE_FIELD_VALUE_TEMPLATE,
        combinedFormFieldService: fields.combinedFormFieldService.value
      });
  
      expect(fields.field.initValue).not.toEqual(fields.field.value);
      expect(fields.autoCompleteField.initValue).not.toEqual(fields.autoCompleteField.value);
  
  
      formService.reset({ keyType: 'include', keys: ['field', 'autoCompleteField'] })
  
      expect(fields.field.initValue).toEqual(fields.field.value);
      expect(fields.autoCompleteField.initValue).toEqual(fields.autoCompleteField.value);
    }
    catch(e) {
      console.log(e);
    }
  })
});