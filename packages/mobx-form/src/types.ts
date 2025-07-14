import { FieldService } from "./field-service";
import { FormService } from "./form-service";
import { CombinedFormFieldService } from "./combined-form-field-service";
import { AutocompleteFieldService } from "./autocompete-field-service";

export type WithFormService = { formService: FormService<any> }

export type EmptyType<T> = never;
  // T extends []? [] :
  // T extends boolean? null :
  // T extends string? '' :
  // T extends number? 0 :
  // T extends object? null :
  // never;

export type ValueType<T> = 
  T extends object ? T | null :
  T extends boolean ? boolean | null :
  T;

export type FormValues<Type> = Type extends IField
  ? Type['value']
  : {
      -readonly [Property in keyof Type]: Type[Property] extends WithFormService ? FormValues<Type[Property]['formService']['fields']> : FormValues<Type[Property]>;
    };

export type FormErrors<Type> = Type extends IField
  ? Type['error']
  : {
      -readonly [Property in keyof Type]: Type[Property] extends WithFormService ? FormErrors<Type[Property]['formService']['fields']> : FormErrors<Type[Property]>;
    };

export type KeyParams<T> = { keyType?: 'include' | 'exclude', keys?: T[]  | any[] }

export interface IField {
  value: unknown;
  error?: string;
  disabled: boolean;
  isValid: boolean;
  isInit: boolean;

  validate?: () => Promise<unknown>;
  reset() : void;
  clear(options: MethodOptions) : void;
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

  setAsInit: () => void;

  reset: (keyParams?: KeyParams<keyof T>) => void;

  disable: () => void;

  enable: () => void;
  
  touch: () => void;
}

export type FieldVariant = FieldService<any> | CombinedFormFieldService | AutocompleteFieldService<any> | WithFormService
export type FormServiceValuesType = Record<string, FieldVariant>

export interface IFormable<T extends FormServiceValuesType = FormServiceValuesType> {
  formService: FormService<T>
}

export type ValidationType = 'only-touched' | 'everything';


type OnChangeHandler<T> = (value: ValueType<T>) => void;
type BeforeChangeHandler<T> = (value: ValueType<T>) => void | 'abort';

export type FieldOptionsType<T> = { onError?: boolean, onChange?: OnChangeHandler<T>; beforeOnChange?: BeforeChangeHandler<T>, disabledFn?: () => boolean; };

export type AutocompleteFieldOptionsType<T> = FieldOptionsType<T> & {
  onInputChange?: OnChangeHandler<string>,
  onInputBeforeChange?: BeforeChangeHandler<string>
}

export type MethodOptions = { validate?: boolean }

export type ResetType = { to?: 'initValue' | 'empty' }