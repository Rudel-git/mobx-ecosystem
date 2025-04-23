import { makeAutoObservable } from 'mobx';
import { FieldOptionsType, IField, ValueType } from './types';
import { isEqual, isObject } from './utils';

type FieldProps<T> = {
  value: T,
  onChange: (_: any, value: ValueType<T>) => void;
  onBlur: (_: any) => void;
  error?: string;
  disabled?: boolean;
}
export class FieldService<T = ValueType<unknown>, P extends FieldProps<T> = FieldProps<T>> implements IField {
  validate?: () => Promise<unknown>;
  _serviceType = 'field-service';
  private _initValue?: ValueType<T> = undefined;
  private _value?: ValueType<T> = undefined;
  private _error?: string = undefined;
  private _disabled = false;
  private _isBlurred = false;

  options?: FieldOptionsType<T>;

  constructor(initValue?: ValueType<T>, options?: FieldOptionsType<T>) {
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
    this.validate?.();
  }

  get value() {
    return this._value;
  }

  set value(value: ValueType<T>) {
    const result = this.options?.beforeChange?.(value);
    if(result === 'abort') {
      return;
    }

    const oldValue = this._value;
    this._value = value;

    if(oldValue !== value) {
      this.options?.onChange?.(value)
    }
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

  get isBlurred() {
    return this._isBlurred;
  }

  set isBlurred(isBlurred: boolean) {
    this._isBlurred = isBlurred;
  }

  get isTouched() {
    return !this.isInit || this.isBlurred
  }

  onChange = (_: any, value: ValueType<T>) => {
    this.value = value;
    this.validate?.();
  }

  onBlur = (_: any) => {
    this.isBlurred = true;
    this.validate?.();
  }

  reset = () => {
    this.value = this.initValue;
    this.isBlurred = false;
  }

  setAsInit = () => {
    this.initValue = this.value;
    this.isBlurred = false;
  }

  touch = () => {
    this.isBlurred = true;
  }

  disable = () => {
    this.disabled = true;
  }

  enable = () => {
    this.disabled = false;
  }

  // TODO: Rethink...
  get props(): P {
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
      onChange: this.onChange,
      onBlur: this.onBlur,
    };
  }
}
