import { FieldService } from "./field-service";
import { FormService } from "./form-service";
import { CombinedFormFieldService } from "./combined-form-field-service";
import { AutocompleteFieldService } from "./autocompete-field-service";

export type ValueType<T> = T | null | undefined;

export type FormValues<Type> = Type extends IField
  ? Type['value']
  : {
      -readonly [Property in keyof ValueType<Type>]: FormValues<Type[Property]>;
    };

export type FormErrors<Type> = Type extends IField
  ? Type['error']
  : {
      -readonly [Property in keyof Type]: FormErrors<Type[Property]>;
    };

export interface IField {
  value: unknown;
  error?: string;
  disabled: boolean;
  isValid: boolean;
  isInit: boolean;

  validate?: () => Promise<unknown>;
  reset() : void;
  setAsInit(): void;
  touch(): void;
  disable: () => void;
  enable: () => void;
}

export interface IForm<T> {
  fields: T;

  validate: (type: ValidationType) => Promise<unknown>

  keys: string[];

  isValid: boolean;

  isTouched: boolean;

  canBeSubmitted: boolean;

  disabled: boolean;

  getValues: () => FormValues<ValueType<T>>

  resetErrors: () => void;

  setValuesAsInit: () => void;

  reset: () => void;

  disable: () => void;

  enable: () => void;
  
  touch: () => void;
}

//  Record<string, FieldService<any> | CombinedFormFieldService | AutocompleteFieldService<any> | Record<string, unknown>>
export type FormServiceValuesType = Record<string, FieldService<any> | CombinedFormFieldService | AutocompleteFieldService<any> | Record<string, unknown>>
  
export interface IFormable<T extends FormServiceValuesType = FormServiceValuesType> {
  formService: FormService<T>
}

// export type FormValues<Type extends { fields: Record<string, unknown> }> = {
//   -readonly [Property in keyof Type['fields']]: RecursiveFormValues<
//     Type['fields'][Property]
//   >;
// };

// export type FormErrors<Type extends { fields: Record<string, unknown> }> = {
//   -readonly [Property in keyof Type['fields']]: RecursiveFormErrors<
//     Type['fields'][Property]
//   >;
// };

export type ValidationType = 'only-touched' | 'everything';


type OnChangeHandler<T> = (value: ValueType<T>) => void;
type BeforeChangeHandler<T> = (value: ValueType<T>) => void | 'abort';

export type FieldOptionsType<T> = { onError?: boolean, onChange?: OnChangeHandler<T>; beforeChange?: BeforeChangeHandler<T> };

export type AutocompleteFieldOptionsType<T> = FieldOptionsType<T> & {
  onInputChange?: OnChangeHandler<string>,
  onInputBeforeChange?: BeforeChangeHandler<string>
}