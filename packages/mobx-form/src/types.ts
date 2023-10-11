import { FormService } from "form-service";
import { FieldService } from "./field-service";
import { CombinedFormFieldService } from "./combined-form-field-service";

export type ValueType<T> = T | null | undefined;

export type FormValues<Type> = Type extends IField
  ? Type['value']
  : {
      -readonly [Property in keyof Type]: FormValues<Type[Property]>;
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

  validate?(): Promise<void>;
  reset() : void;
  setAsInit(): void;
}

export type FormServiceValuesType = Record<string, FieldService<unknown> | Record<string, unknown>>;
  
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