import { isFormService } from "./utils/hasFormService";
import { makeAutoObservable } from 'mobx';

import { FieldService } from './field-service';
import { _checkConfiguration, preSubmitValidationError, validate } from './configure-form';
import { FieldOptionsType, FormErrors, FormServiceValuesType, FormValues, IForm, KeyParams, MethodOptions, ResetType, ValidationType, ValueType } from './types';
import { CombinedFormFieldService } from './combined-form-field-service';
import { AutocompleteFieldService } from './autocompete-field-service';
import { hasFormService } from './utils';

export class FormService<T extends FormServiceValuesType> implements IForm<T> {
  fields: T = {} as T;
  
  validationSchema?: unknown;

  onSubmit?: () => Promise<unknown>;

  
  private onValidate?: (type: ValidationType) => unknown;

  private onClear?: () => void;

  private onReset?: (params?: ResetType) => void;

  constructor(
    fields: T,
    validationSchema?: unknown,
  ) {
    _checkConfiguration();
    
    makeAutoObservable(this)

    this.fields = fields;
    this.validationSchema = validationSchema;

    this.setValidationToFields();
  }

  setOnSubmit = (onSubmit: () => Promise<unknown>) => {
    this.onSubmit = onSubmit;
  }

  setOnValidate = (onValidate: (type: ValidationType) => unknown) => {
    this.onValidate = onValidate;
  }

  setOnClear = (onClear: () => void) => {
    this.onClear = onClear;
  }

  setOnReset = (onReset: (params?: ResetType) => void) => {
    this.onReset = onReset;
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
  readonly validate = async (type: ValidationType = 'only-touched') => {
    const fieldValues = this.getValues();
    
    // валидация для сложных форм снизу -> вверх
    await this.bypassFields(this.fields, async (field) => {
      if(isFormService(field)) {
        return await field.validate(type)
      }

      if(field instanceof CombinedFormFieldService) {
        return await field.validateFields?.(type);
      }

      return null;
    })

    if(fieldValues) {
       // валидация для простейших полей сверху -> вниз
      const errors = await validate?.(fieldValues, this.validationSchema) as FormErrors<T>;

      if(errors && Object.keys(errors || []).length != 0) {
        this.setValidationError(errors, type);
      }
      else {
        this.resetValidationErrors();
      }
    }

    this.onValidate?.(type);
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
      const current = this.fields[key];

      if(hasFormService(current)) {
        values[key] = current.formService.getValues();
      }
      else {
        values[key] = this.getValue(current);
      }
    }

    return values as FormValues<ValueType<T>>;
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

  private bypassFields = (fields: any, action: (field: FieldService<unknown> | CombinedFormFieldService | AutocompleteFieldService | FormService<any>, levelParams?: any) => void, levelParams?: any): unknown | Promise<unknown> => {
    if(fields instanceof FieldService || fields instanceof CombinedFormFieldService || fields instanceof AutocompleteFieldService) {
      return action(fields, levelParams);
    }
    else if(hasFormService(fields)) {
      return action(fields.formService, levelParams);
    }
    else if(typeof fields === 'object') {
      return Promise.all(Object.keys(fields || {}).map(key => {
        return this.bypassFields(fields?.[key], action, levelParams?.[key]);
      }));
    }
  }

  private setValidationToFields = () => {
    this.bypassFields(
      this.fields, 
      (field) => {
        if(!isFormService(field)) {
          if(field instanceof FieldService || field instanceof AutocompleteFieldService) {
            field.validate = this.validate
          }
          else {
            field._validate = this.validate;
          }
        }
      }, 
    );
  }

    private getFieldsByKeys = ({ keyType = 'include', keys = [] } : KeyParams<keyof T>) => {
    let _keys = [];

    if(keyType === 'include') {
      _keys = keys;
    }
    else {
      _keys = Object.keys(this.fields).filter(fieldKey => !keys.includes(fieldKey))
    }

    let fields: Record<string, any> = {};
    _keys.forEach(key => fields[key] = this.fields?.[key])

    return fields;
  }

  
  /**
  * Set object to init values by form service keys
  */
  setInitValues = (values: Partial<FormValues<T>>, { validate }: { validate?: boolean } = {}) => {
    const fields = this.getFieldsByKeys({
      keyType: 'include',
      keys: Object.keys(values)
    });

    this.bypassFields(
      fields, 
      (field, levelParams) => {
        if(isFormService(field)) {
          field.setInitValues(levelParams, { validate })
        }
        else {
          field.setInitValue(levelParams, { validate })
        }
      },
      values
    );

    if(validate) {
      this.validate();
    }
  };

  /**
  * Set object to values by form service keys
  */
  setValues = (values: Partial<FormValues<T>>, { validate }: MethodOptions = {}) => {
    const fields = this.getFieldsByKeys({
      keyType: 'include',
      keys: Object.keys(values)
    });
    
    this.bypassFields(
      fields, 
      (field, levelParams) => {
        if(isFormService(field)) {
          field.setValues(levelParams);
        }
        else {
          field.value = levelParams
        }
      },
      values
    );

    if(validate) {
      this.validate('everything');
    }
  };

  private resetValidationErrors = () => {
    this.bypassFields(this.fields, (field) => {
      if(!isFormService(field)) {
       field.error = undefined
      }
    })
  }

  /**
   * Set field errors to undefined
   */
  resetErrors = () => {
    this.bypassFields(this.fields, (field) => {
      if(isFormService(field)) {
        field.resetErrors();
      }
      else {
        field.error = undefined
      }
    })
  }

  private setValidationError = (error: Partial<FormErrors<T>>, validationType: ValidationType = 'only-touched',) => {
      this.bypassFields(
      this.fields, 
      (field, levelParams) => {
        if(field.isTouched || validationType === 'everything') { // set error only if it's changed
           if(!isFormService(field)) {
              field.error = levelParams
            }
        }
      }, 
      error
    );
  }

  /**
   * Set errors for fields
   * @param errors object of string which provides errors for fields
   */
  setErrors(error: Partial<FormErrors<T>>, validationType: ValidationType = 'only-touched') {
    this.bypassFields(
      this.fields, 
      (field, levelParams) => {
        if(field.isTouched || validationType === 'everything') { // set error only if it's changed
           if(isFormService(field)) {
              if(levelParams) {
                field.setErrors(levelParams, validationType)
              }
            }
            else {
              field.error = levelParams
            }
        }
      }, 
      error
    );
  }

   /**
   * Set field values to init values
   */
   setAsInit = () => {
    this.bypassFields(this.fields, (field) => {
      field.setAsInit();
    })
  };

  /**
   * Reset fields to their own initial values
   */
  reset = (params?: KeyParams<keyof T> & ResetType) => {
    const { to, ...keyParams }  = params || {};
    const fields = keyParams?.keys? this.getFieldsByKeys(keyParams) : this.fields;
  
    this.bypassFields(fields, (field) => {
      field.reset({ to })
    })

    this.onReset?.({ to });
   
    this.validate();
  };

    /**
   * Clear fields to their first/constructor initial values
   */
  clear = (params?: KeyParams<keyof T> & MethodOptions) => {
    const { validate = true, ...keyParams } = params || {};
    const fields = keyParams?.keys? this.getFieldsByKeys(keyParams) : this.fields;
  
    this.bypassFields(fields, (field) => {
      field.clear({ validate })
    })

    this.onClear?.();

    if(validate) {
      this.validate();
    }
  };

  /**
   * Pass true to the property 'disabled'
   */
  disable = (keyParams?: KeyParams<keyof T>) => {
    const fields = keyParams?.keys? this.getFieldsByKeys(keyParams) : this.fields;

    this.bypassFields(fields, (field) => field.disable())
  };

  /**
   * Pass false to the property 'disabled'
   */
  enable = (keyParams?: KeyParams<keyof T>) => {
    const fields = keyParams?.keys? this.getFieldsByKeys(keyParams) : this.fields;

    this.bypassFields(fields, (field) => field.enable())
  };
  
  touch = () => {
    this.bypassFields(this.fields, (field) => field.touch())
  }

  setDisabledFn = (disabledFn: FieldOptionsType<T>['disabledFn']) => {
    this.bypassFields(this.fields, (field) => {
      if(isFormService(field)) {
        field.setDisabledFn(disabledFn);
      }
      else {
        field.setDisabledFn(disabledFn);
      }
    })
  }
}
