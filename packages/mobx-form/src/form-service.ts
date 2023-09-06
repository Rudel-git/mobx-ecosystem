import { makeAutoObservable, runInAction } from 'mobx';

import { FieldService } from './field-service';
import { _checkConfiguration, validate } from 'configure-form';
export class FormService<T extends Record<string, FieldService<unknown>>> {
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

    this.setValidationToFields(this.fields);
  }

  private setValidationToFields = (fields: any) => {
    if(typeof fields === 'object') {
      Object.keys(fields || {}).forEach(key => {
        this.setValidationToFields(fields?.[key]);
      });
    }
    else {
      fields.validate = this.validate;
    }
  }

  /***
   * Validate the form
   * 
   * *Configure this method with configureForm from mobx-form
   */
  validate = async () => {
    const fieldValues = this.getValues();
    const errors = await validate?.(fieldValues, this.validationSchema);

    console.log({ validateDebug: { fieldValues, errors }})

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
    return this.keys.every(key => this.fields[key].isValid);
  }

  /**
   * Check each field if its isInit = false
   */
  get isTouched() {
    return this.keys.some(key => !this.fields[key].isInit);
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

      if(typeof value === 'object') {
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
    this.keys.forEach(key => {
      runInAction(() => {
        this.fields[key].validate = this.validate;
      })
    });
  };

   /**
   * Set object to values by form service keys
   */
  setValues = (obj: Record<string, unknown>) => {
    this.keys.forEach(key => (this.fields[key].value = obj[key]));
  };

   /**
   * Set object to init values by form service keys
   */
  setInitValues = (obj: Record<string, unknown>) => {
    this.keys.forEach(key => (this.fields[key].initValue = obj[key]));
  };
  
  /**
   * Set field values to init values
   */
  setValuesAsInit = () => {
    this.keys.forEach(key => {
      this.fields[key].initValue = this.fields[key].value;
    });
  };

  /**
   * Set field errors to undefined
   */
  resetErrors = () => {
    this.keys.forEach(key => (this.fields[key].error = undefined));
  }

  /**
   * Set errors for fields
   * @param errors object of string which provides errors for fields
   */
  setErrors(errors: Record<string, any>) {
    this.keys.forEach(key => {
      this.setError(errors?.[key], this.fields[key])
    });
  }

  private setError = (error: any, field: FieldService<any>) => {
    console.log({ debug: { error, field }})

    if(typeof error !== 'string' && field  && field instanceof FieldService) {
      Object.keys(error || {}).forEach(key => {
        if(key in field.value) {
          this.setError(error?.[key], field.value?.[key]);
        }
      })
    }
    else {
      field.error = error;
    }
  }

  /**
   * Reset fields to their own initial values
   */
  reset = () => {
    this.keys.forEach(
      key => (this.fields[key].value = this.fields[key].initValue),
    );
    this.validate();
  };

  /**
   * Pass true to the property 'disabled'
   */
  disable = () => {
    this.keys.forEach(key => (this.fields[key].disabled = true));
  };

  /**
   * Pass false to the property 'disabled'
   */
  enable = () => {
    this.keys.forEach(key => (this.fields[key].disabled = false));
  };
}
