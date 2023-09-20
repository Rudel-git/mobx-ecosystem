import { FormService } from "form-service";
import { FieldService } from "./field-service";

export type FormValues<Type> = Type extends FieldService<unknown>
  ? Type['value']
  : {
      -readonly [Property in keyof Type]: FormValues<Type[Property]>;
    };

export type FormErrors<Type> = Type extends FieldService<unknown>
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
