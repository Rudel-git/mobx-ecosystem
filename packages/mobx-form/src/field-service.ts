import { isEqual } from 'lodash';
import { makeAutoObservable } from 'mobx';
import { IField, ValueType } from './types';
import { isObject } from 'utils';
import mitt, { Emitter } from 'mitt';
import { FormService } from './form-service';

type FieldOptionsType = { onError?: boolean };

export class FieldService<T = ValueType<unknown>> implements IField {
  eventBus?: Emitter<{ ON_CHANGE: ValueType<T> }>;

  validate?(): Promise<void>;
  _serviceType = 'field-service';
  private _initValue?: ValueType<T> = undefined;
  private _value?: ValueType<T> = undefined;
  private _error?: string = undefined;
  private _disabled = false;

  options?: FieldOptionsType;

  constructor(initValue?: ValueType<T>, options?: FieldOptionsType) {
    makeAutoObservable(this);

    this.initValue = initValue;
    this.options = options;
  }

  get initValue() {
    return this._initValue;
  }

  set initValue(initValue: ValueType<T>) {
    this._initValue = initValue;
    this._value = initValue;
    this.validate && this.validate();
  }

  get value() {
    return this._value;
  }

  set value(value: ValueType<T>) {
    this._value = value;
    this.eventBus?.emit("ON_CHANGE", value);
  }

  get error() {
    return this._error;
  }

  set error(error: string | undefined) {
    this._error = error;
  }

  get disabled() {
    return this._disabled;
  }

  set disabled(disabled: boolean) {
    this._disabled = disabled;
  }

  get isValid() {
    return !this._error;
  }

  get isInit() {
    if (isObject(this.value)) {
      return isEqual(this.value, this._initValue);
    }

    return this._value === this._initValue;
  }

  createListener = () => {
    this.eventBus = mitt();
  }

  onChange = (_: any, value: ValueType<T>) => {
    this.value = value;
    this.validate && this.validate();
  }

  reset = () => {
    this.value = this.initValue;
  }

  // TODO: Rethink...
  get props() {
    let commonProps: any = {
      value: this.value,
      error: this.error,
      disabled: this.disabled,
    };

    if (this.options?.onError) {
      commonProps = {
        ...commonProps,
        onError: (err: any) => {
          this.error = this.error || err?.toString();
        },
      };
    }

    return {
      ...commonProps,
      onChange: this.onChange
    };
  }
}
