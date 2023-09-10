import { FieldService } from "field-service";

type RecursiveFormValues<Type> = Type extends FieldService<unknown>
  ? Type['value']
  : {
      -readonly [Property in keyof Type]: RecursiveFormValues<Type[Property]>;
    };

type RecursiveFormErrors<Type> = Type extends FieldService<unknown>
  ? Type['error']
  : {
      -readonly [Property in keyof Type]: RecursiveFormValues<Type[Property]>;
    };
  

export type FormValues<Type extends { fields: Record<string, unknown> }> = {
  -readonly [Property in keyof Type['fields']]: RecursiveFormValues<
    Type['fields'][Property]
  >;
};

export type FormErrors<Type extends { fields: Record<string, unknown> }> = {
  -readonly [Property in keyof Type['fields']]: RecursiveFormErrors<
    Type['fields'][Property]
  >;
};
