export type ValidateFunction = (validationSchema: unknown) => Promise<Record<string, string>>;

export let validate: ValidateFunction | undefined;

export interface ConfigurationForm {
  validation: {
    validate: ValidateFunction;
  }
}

export const configureForm = (configuration: ConfigurationForm) => {
  validate = configuration.validation.validate;
}

export const _checkConfiguration = () => {
  if(!validate)
    throw new Error("You must define configureForm to configure mobx-form");
}