import { FormValues, IField, IFormable } from './types';
import { makeAutoObservable } from 'mobx';

export class CombinedFormFieldService<T extends IFormable = IFormable> implements IField {
  validate?(): Promise<void>;
  private _touched = false;
  private _disabled = false;
  private _error?: string = undefined;

  private _initValue: T[] = [];
  private _value: T[] = [];

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
    this._validate();

    // вариант, когда используется сразу 2 схемы. На массив объектов, а в объекте своя схема
    // this._initValue.forEach(it => {
    //   it.formService.validate = () => {
    //     return it.formService.validate();
    //   }
    // })
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
    this._validate();
  }

  removeByIndex = (index: number) => {
    this.value.splice(index, 1);
    this.setTouched(true);
    this._validate();
  }

  _validate = () => {
    this.value.forEach(it => it.formService.validate());
    this.validate?.();
  }

  reset = () => {
    this._value = this.initValue;
    this._value.forEach(it => it.formService.reset());
    this.setTouched(false);
  }

  setAsInit = () => {
    this._initValue = this.value;
    this._value.forEach(it => it.formService.setValuesAsInit());
    this.setTouched(false);
  }

  getValues = () => {
    return this.value.map(it => it.formService.getValues()) as (FormValues<T['formService']['fields']>)[];
  }
}
