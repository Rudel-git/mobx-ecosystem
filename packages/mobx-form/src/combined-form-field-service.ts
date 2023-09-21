import { IField, IFormable } from './types';
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
    this.value.forEach(it => it.formService.reset());

    this._touched = false;
    this._validate();
  }

  get value() {
    return this._value;
  }

  set value(array: T[]) {
    this._value = array;
    this._touched = true;
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

  add = (value: T) => {
    this.value.push(value);
    this._touched = true;
    this._validate();
  }

  removeByIndex = (index: number) => {
    this.value.splice(index, 1);
    this._touched = true;
    this._validate();
  }

  _validate = () => {
    this.value.forEach(it => it.formService.validate());
    this.validate?.();
  }
}
