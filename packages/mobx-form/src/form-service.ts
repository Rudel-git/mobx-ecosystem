import { makeAutoObservable } from 'mobx';

import { FieldService } from './field-service';
import { _checkConfiguration, validate } from 'configure-form';

export class FormService<T extends Record<string, FieldService<unknown> | Record<string, unknown>>> {
  fields: T;
  validationSchema?: unknown;

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

  /***
   * Validate the form
   * 
   * *Configure this method with configureForm from mobx-form
   */
  validate = async () => {
    const fieldValues = this.getValues();
    console.log(fieldValues);
    const errors = await validate?.(fieldValues, this.validationSchema);
    console.log(errors);

    if(errors && Object.keys(errors || []).length != 0) {
      this.setErrors(errors);
    }
    else {
      this.resetErrors();
    }
  };

  setValidationSchema = (validationSchema: unknown) => {
    this.validationSchema = validationSchema;
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
   * Check each field if its isInit = false
   */
  get isTouched() {
    let isTouched = false;

    this.bypassFields(
      this.fields, 
      (field) => {
        if(!field.isInit) {
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
   * 
   * @returns Object of field values
   */
  getValues = () => {
    const values: Record<string, unknown> = {};

    for(const key of this.keys) {
      values[key] = this.getValue(this.fields[key]?.value);
    }

    return values;
  };

  private getValue: any = (value: any) => {
    if(value) {
      if(value instanceof FieldService) {
        return this.getValue(value?.value);
      }
      else if(typeof value === 'object') {
        const values: Record<string, unknown> = {};

        for(const key of Object.keys(value)) {
          values[key] = this.getValue(value?.[key]);
        }

        return values;
      }
    }
    
    return value;
  }

  /**
 * Set fields by this
 */
  setFieldsByThis = (obj: any) => {
    const fields = {} as any;
    Object.keys(obj).forEach(key => {
      if (obj[key] && obj[key] instanceof FieldService) {
        fields[key] = obj[key];
      }
    });

    this.fields = fields;
    this.setValidationToFields();
  };

  private bypassFields = <T>(fields: any, action: (field: FieldService<unknown>, levelParams?: T) => void, levelParams?: any) => {
    if(fields instanceof FieldService) {
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
  setInitValues = (values: Record<string, unknown>) => {
    this.bypassFields(
      this.fields, 
      (field, levelParams) => field.initValue = levelParams, 
      values
    );
  };

  /**
  * Set object to values by form service keys
  */
  setValues = (values: Record<string, unknown>) => {
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
  setErrors(error: any) {
    this.bypassFields(
      this.fields, 
      (field, levelParams?: string) => {
        console.log(field);
        console.log(levelParams);
        field.error = levelParams
      }, 
      error
    );
  }

   /**
   * Set field values to init values
   */
   setValuesAsInit = () => {
    this.bypassFields(this.fields, (field) => field.initValue = field.value)
  };

  /**
   * Reset fields to their own initial values
   */
  reset = () => {
    this.bypassFields(this.fields, (field) => field.value = field.initValue)
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
}
