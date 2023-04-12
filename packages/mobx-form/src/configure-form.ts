export type ValidateFunction = () => Promise<Record<string, string>>;

export let validate: ValidateFunction | undefined;

export interface ConfigurationForm {
  validation: {
    validate: ValidateFunction;
  }
}

export const configureForm = (configuration: ConfigurationForm) => {
  validate = configuration.validation.validate;
}

// validation: {
//   validate: async (yupSchema: any) => {
//     try {  
//       await yupSchema?.validate(fieldValues, {
//         abortEarly: false,
//       });
//     } catch (err: unknown) {
//       if (err instanceof Yup.ValidationError) {
//         return yupToFormErrors(err);
//       } else {
//         throw err;
//       }
//     }
//   }
// }

// const yupToFormErrors = (yupError: any) => {
//   let errors = {} as Record<string, string>;

//   if (yupError.inner) {
//     if (yupError.inner.length === 0) {
//       return setIn(errors, yupError.path, yupError.message);
//     }
//     for (const err of yupError.inner) {
//       if (!getIn(errors, err.path)) {
//         errors = setIn(errors, err.path, err.message);
//       }
//     }
//   }
//   return errors;
// };

export const _checkConfiguration = () => {
  if(!validate)
    throw new Error("You must define configureForm to configure mobx-form");
}