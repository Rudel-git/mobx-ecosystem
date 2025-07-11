
import { FormService } from "../form-service";
import { WithFormService } from "../types";

export const hasFormService = (obj: any): obj is WithFormService => {
  return obj && typeof obj === 'object' && 'formService' in obj
}

export const isFormService = (obj: any): obj is FormService<any> => {
  return obj && obj instanceof FormService;
}