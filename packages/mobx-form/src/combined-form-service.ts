import { FormService } from "form-service";
import { makeAutoObservable } from "mobx";
import { IForm, ValidationType } from "types";

export class CombinedFormService implements IForm<any>{
  formServices: FormService<any>[] = [];

  constructor() {
    makeAutoObservable(this);
  }

  setForms = (formServices: FormService<any>[]) => {
    this.formServices = formServices;
  }
  
  get fields() {
    return this.formServices.map(it => it.fields).flat();
  }

  get keys() {
    return this.formServices.map(it => it.keys).flat();
  }

  get isValid() {
    return this.formServices.every(it => it.isValid);
  }

  get isTouched() {
    return this.formServices.some(it => it.isTouched);
  }

  get canBeSubmitted() {
    return this.isTouched && this.isValid;
  }

  get disabled() {
    return this.formServices.every(it => it.disabled);
  }

  validate = async (type: ValidationType) => {
    for(const form of this.formServices) {
      await form.validate(type);
    }
  }

  getValues = () => {
    return this.formServices.map(it => it.getValues());
  }

  resetErrors = () => {
    return this.formServices.forEach(it => it.resetErrors());
  }

  setValuesAsInit = () => {
    return this.formServices.forEach(it => it.setValuesAsInit());
  }

  reset = () => {
    return this.formServices.forEach(it => it.reset());
  }

  disable = () => {
    return this.formServices.forEach(it => it.disable());
  }

  enable = () => {
    return this.formServices.forEach(it => it.enable());
  }

  touch = () => {
    this.formServices.forEach(it => it.touch());
  }
}