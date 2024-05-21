import { makeAutoObservable } from 'mobx';

import { FieldService } from './field-service';
import { _checkConfiguration, preSubmitValidationError, validate } from 'configure-form';
import { FormErrors, FormValues, IForm, ValidationType } from './types';
import { CombinedFormFieldService } from './combined-form-field-service';
import { AutocompleteFieldService } from 'autocompete-field-service';

export class FormService<T extends Record<string, FieldService<any> | CombinedFormFieldService | AutocompleteFieldService<any> | Record<string, unknown>>> implements IForm<T> {
  fields: T;
  validationSchema?: unknown;

  onSubmit?: () => Promise<unknown>;

  constructor(
    fields: T,
    validationSchema?: unknown,
  ) {
    _checkConfiguration();
    
    makeAutoObservable(this);

    this.fields = fields;
    this.validationSchema = validationSchema;

    this.setValidationToFields();
  }

  setOnSubmit = (onSubmit: () => Promise<unknown>) => {
    this.onSubmit = onSubmit;
  }

  submit = async () => {
    await this.validate('everything');

    if (this.canBeSubmitted) {
      return this.onSubmit?.();
    } else {
      preSubmitValidationError?.();
    }
  }

  /***
   * Validate the form
   * 
   * *Configure this method with configureForm from mobx-form
   */
  validate = async (type: ValidationType = 'only-touched') => {
    const fieldValues = this.getValues();
    const errors = await validate?.(fieldValues, this.validationSchema) as FormErrors<T>;

    if(errors && Object.keys(errors || []).length != 0) {
      this.setErrors(errors, type);
    }
    else {
      this.resetErrors();
    }
  };

  setValidationSchema = (validationSchema: unknown) => {
    this.validationSchema = validationSchema;
    this.setValidationToFields();
  }

  /**
   * Return field keys
   */
  get keys() {
    return Object.keys(this.fields);
  }

  /**
   * Check each field if its isValid = true
   */
  get isValid() {
    let isValid = true;

    this.bypassFields(
      this.fields, 
      (field) => {
        if(!field.isValid) {
          isValid = false
        }
      }
    );

    return isValid;
  }

  /**
   * Check each field if its isTouched = true
   */
  get isTouched() {
    let isTouched = false;

    this.bypassFields(
      this.fields, 
      (field) => {
        if(field.isTouched) {
          isTouched = true;
        }
      }
    );

    return isTouched;
  }

  /**
   * Check if isTouched = true && isValid = true
   */
  get canBeSubmitted() {
    return this.isTouched && this.isValid;
  }

  /**
   * always true if the form service is empty
   */
  get disabled() {
    let disabled = true;

    this.bypassFields(
      this.fields, 
      (field) => {
        if(!field.disabled) {
          disabled = false
        }
      }
    );

    return disabled;
  }

  /**
   * 
   * @returns Object of field values
   */
  getValues = () => {
    const values: Record<string, unknown> = {};

    for(const key of this.keys) {
      values[key] = this.getValue(this.fields[key]);
    }

    return values as FormValues<T>;
  };

  private getValue: any = (value: any) => {
    if(value instanceof FieldService || value instanceof CombinedFormFieldService || value instanceof AutocompleteFieldService) {
      return value?.value
    }
    else if(typeof value === 'object') {
      const values: Record<string, unknown> = {};

      for(const key of Object.keys(value)) {
        values[key] = this.getValue(value?.[key]);
      }

      return values;
    }
    
    return value;
  }

  /**
 * Set fields by this
 */
  setFieldsByThis = (obj: any) => {
    const fields = {} as any;
    Object.keys(obj).forEach(key => {
      if (obj[key] && obj[key] instanceof FieldService || obj[key] instanceof CombinedFormFieldService || obj[key] instanceof AutocompleteFieldService) {
        fields[key] = obj[key];
      }
    });

    this.fields = fields;
    this.setValidationToFields();
  };

  private bypassFields = <T>(fields: any, action: (field: FieldService<unknown> | CombinedFormFieldService | AutocompleteFieldService, levelParams?: T) => void, levelParams?: any) => {
    if(fields instanceof FieldService || fields instanceof CombinedFormFieldService || fields instanceof AutocompleteFieldService) {
      // if(typeof fields.value === 'object') {
      //   this.bypassFields(fields.value, action, levelParams)
      // }

      action(fields, levelParams);
    }
    else if(typeof fields === 'object') {
      Object.keys(fields || {}).forEach(key => {
        this.bypassFields(fields?.[key], action, levelParams?.[key]);
      });
    }
  }

  private setValidationToFields = () => {
    this.bypassFields(
      this.fields, 
      (field) => field.validate = this.validate, 
    );
  }
  
  /**
  * Set object to init values by form service keys
  */
  setInitValues = (values: Partial<FormValues<T>>) => {
    this.bypassFields(
      this.fields, 
      (field, levelParams) => field.initValue = levelParams, 
      values
    );
  };

  /**
  * Set object to values by form service keys
  */
  setValues = (values: Partial<FormValues<T>>) => {
    this.bypassFields(
      this.fields, 
      (field, levelParams) => field.value = levelParams, 
      values
    );
  };

  /**
   * Set field errors to undefined
   */
  resetErrors = () => {
    this.bypassFields(this.fields, (field) => field.error = undefined)
  }

  /**
   * Set errors for fields
   * @param errors object of string which provides errors for fields
   */
  setErrors(error: Partial<FormErrors<T>>, validationType: ValidationType = 'only-touched') {
    this.bypassFields(
      this.fields, 
      (field, levelParams?: string) => {
        if(field.isTouched || validationType === 'everything') { // set error only if it's changed
          field.error = levelParams
        }
      }, 
      error
    );
  }

   /**
   * Set field values to init values
   */
   setValuesAsInit = () => {
    this.bypassFields(this.fields, (field) => {
      field.setAsInit();
    })
  };

  /**
   * Reset fields to their own initial values
   */
  reset = () => {
    this.bypassFields(this.fields, (field) => field.reset())
    this.validate();
  };

  /**
   * Pass true to the property 'disabled'
   */
  disable = () => {
    this.bypassFields(this.fields, (field) => field.disabled = true)
  };

  /**
   * Pass false to the property 'disabled'
   */
  enable = () => {
    this.bypassFields(this.fields, (field) => field.disabled = false)
  };
  
  touch = () => {
    this.bypassFields(this.fields, (field) => field.touch())
  }
}
