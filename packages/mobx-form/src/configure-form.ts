
import { ValueType } from "./types";

// Когда ошибок нет, реализация не возвращает ничего (см. form-service.validate).
export type ValidateFunction = 
  (fieldValues: Record<string, ValueType<unknown>>, validationSchema: unknown) => Promise<Record<string, string> | undefined>;

export type PreSubmitValidationFunction = 
  () => void;

export let validate: ValidateFunction | undefined;
export let preSubmitValidationError: PreSubmitValidationFunction | undefined;

export interface ConfigurationForm {
  validation: {
    validate: ValidateFunction;
    preSubmitValidationError: () => void;
  }
}

export const configureForm = (configuration: ConfigurationForm) => {
  validate = configuration.validation.validate;
  preSubmitValidationError = configuration.validation.preSubmitValidationError;
}

export const _checkConfiguration = () => {
  if(!validate || !preSubmitValidationError)
    throw new Error("You must define configureForm to configure mobx-form");
}