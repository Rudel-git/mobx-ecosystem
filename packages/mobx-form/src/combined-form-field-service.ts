import { FieldOptionsType, FormServiceValuesType, FormValues, IField, IFormable, MethodOptions, ValidationType, ValueType } from './types';
import { makeAutoObservable } from 'mobx';

export class CombinedFormFieldService<T extends IFormable<FormServiceValuesType> = IFormable<FormServiceValuesType>> implements IField {
  private _touched = false;
  private _disabled = false;
  private _error?: string = undefined;

  private _initValue: T[] = [];
  private _value: T[] = [];

  _validate?: () => Promise<unknown>;

  constructor(initValue?: T[]) {
    makeAutoObservable(this);

    this.initValue = initValue || [];
  }

  get initValue() {
    return this._initValue;
  }

  set initValue(_initValue: T[]) {
    this._initValue = _initValue;
    this._value = _initValue.slice(0); // copy array without objects

    this.setTouched(false);
    this.validate?.('only-touched');
  }

  get value() {
    return this._value;
  }

  set value(array: T[]) {
    this._value = array;
    this.setTouched(true);
  }

  get disabled() {
    return this._disabled;
  }

  set disabled(disabled: boolean) {
    this._disabled = disabled;

    if(disabled) {
      this.value.forEach(it => it.formService.disable())
    }
    else {
      this.value.forEach(it => it.formService.enable())
    }
  }

  get error() {
    return this._error;
  }

  set error(error: string | undefined) {
    this._error = error;
  }

  get isValid() {
    return !this._error && this.value.every(it => it.formService.isValid);
  }

  get isTouched() {
    return this._touched || this.value.some(it => it.formService.isTouched);
  }

  get isInit() {
    return !this.isTouched;
  }

  get hasItems() {
    return Boolean(this.value.length);
  }

  private setTouched = (touched: boolean) => {
    this._touched = touched;
  }

  add = (value: T) => {
    this.value.push(value);
    this.setTouched(true);
    this.validate?.('only-touched');
  }

  removeByIndex = (index: number) => {
    this.value.splice(index, 1);
    this.setTouched(true);
    this.validate?.('only-touched');
  }

  reset = () => {
    this._value = this.initValue.slice(0); // copy array without objects
    this._value.forEach(it => it.formService.reset());
    this.setTouched(false);
  }

  clear = ({ validate = true }: MethodOptions) => {
    this._value = this.initValue.slice(0); // copy array without objects
    this._value.forEach(it => it.formService.clear({ validate }));
    this.setTouched(false);
  }

  setAsInit = () => {
    this.initValue = this.value;
    this._value.forEach(it => it.formService.setAsInit());
    this.setTouched(false);
  }

  getValues = () => {
    return this.value.map(it => it.formService.getValues()) as (FormValues<T['formService']['fields']>)[];
  }

  touch = () => {
    this.value.forEach(it => it.formService.touch());
    this.setTouched(true);
  }

  validateFields = (type: ValidationType = 'everything') => {
    return Promise.all(this.value.map(it => it.formService.validate(type)));
  }

  validate = async (type: ValidationType = 'everything') => {
    return Promise.all([this._validate?.(), this.validateFields(type)])
  }

  disable = () => {
    this.disabled = true;
  }

  enable = () => {
    this.disabled = false;
  }

  setDisabledFn = (disabledFn: FieldOptionsType<T>['disabledFn']) => {
    this.value.forEach(it => it.formService.setDisabledFn(disabledFn));
  }

  setInitValue = (_initValue: T[], { validate }: MethodOptions = {}) => {
    this._initValue = _initValue;
    this._value = _initValue.slice(0); // copy array without objects

    this.setTouched(false);

    if(validate) {
      this.validate?.('only-touched');
    }
  }
}
