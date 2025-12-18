import { FieldService } from "./field-service";
import { makeAutoObservable } from "mobx";
import { AutocompleteFieldOptionsType, FieldOptionsType, IField, MethodOptions, ValueType } from "./types";

export class AutocompleteFieldService<T extends ValueType<object | unknown[]> = ValueType<object | unknown[]>> implements IField {
  field: FieldService<T>;
  inputField = new FieldService('');

  options?: AutocompleteFieldOptionsType<T>;
  
  constructor(initValue: ValueType<T>, options?: AutocompleteFieldOptionsType<T>) {
    makeAutoObservable(this);

    this.options = options;

    this.field = new FieldService<T>(initValue, { onChange: options?.onChange, beforeOnChange: options?.beforeOnChange, hasEvents: options?.hasEvents });
  }

  get events() {
    return this.field.events;
  }

  get validate() {
    return this.field.validate;
  }

  set validate(validate: (() => Promise<unknown>) | undefined) {
    this.field.validate = validate;
  }

  setValue = (value: ValueType<T>, { inputValue = "", withNotification = true, withBlur = true }) => {
    if(!withNotification) {
      this.field.value = value;
      this.inputField.value = inputValue;

      this.field.validate?.();
      this.inputField.validate?.();
    }
    else {
      this.field.value= value;
      this.inputField.value = inputValue;
    }

    if(withBlur) {
      return this.field.isBlurred = true;
    }
  }

  reset = () => {
    this.field.reset();
  }

  clear = () => {
    this.field.clear();
  }

  setAsInit = () => {
    this.field.setAsInit();
  }

  onInputChange = (e: any, value: string) => {
    const result = this.options?.onInputBeforeChange?.(value);
    if(result === 'abort') {
      return;
    }

    const oldValue = this.inputField.value;
    this.inputField.value = value;

    if(oldValue !== value) {
      this.options?.onInputChange?.(value)
    }
  }

  private onFocus = () => {
    this.options?.onFocus?.()
  }

  touch = () => {
    this.field.touch();
  }

  disable = () => {
    this.field.disabled = true;
  }

  setDisabledFn = (disabledFn: FieldOptionsType<T>['disabledFn']) => {
    this.field.setDisabledFn(disabledFn);
  }

  enable = () => {
    this.field.disabled = false;
  }

  setInitValue = (initValue: ValueType<T>, { validate }: MethodOptions = {}) => {
    this.field.setInitValue(initValue, { validate });

    if(validate) {
      this.validate?.();
    }
  }

  get value() {
    return this.field.value;
  }

  set value(value: ValueType<T>) {
    this.field.value = value;
  }

  get error() {
    return this.field.error;
  }

  set error(error: string | undefined) {
    this.field.error = error;
  }

  get disabled() {
    return this.field.disabled;
  }

  set disabled(disabled: boolean) {
    this.field.disabled = disabled;
  }

  get isValid() {
    return this.field.isValid;
  }

  get isInit() {
    return this.field.isInit;
  }

  set initValue(initValue: ValueType<T>) {
    this.field.initValue = initValue;
  }

  get isTouched() {
    return this.field.isTouched;
  }

  get initValue() {
    return this.field.initValue;
  }

  get props() {
    return {
      ...this.field.props,
      onSearchChange: this.onInputChange,
      onFocus: this.onFocus,
      loading: this.options?.loadingFn? this.options?.loadingFn() : false,
      options: this.options?.optionsFn? this.options?.optionsFn() : [],
    };
  }

  dispose = () => {
    this.field.dispose();
  }
}