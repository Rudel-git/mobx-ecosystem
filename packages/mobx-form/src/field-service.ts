import { makeAutoObservable } from 'mobx';
import { EmptyType, FieldOptionsType, IField, MethodOptions, ValueType } from './types';
import { isBoolean, isEqual, isNumber, isObject, isString } from './utils';

type FieldProps<T> = {
  value: T,
  onChange: (_: any, value: ValueType<T>) => void;
  onBlur: (_: any) => void;
  error?: string;
  disabled?: boolean;
}

const getEmptyValueType = <T,>(value: unknown): EmptyType<T> => {
  if (isString(value)) {
    return '' as EmptyType<T>;
  }
  else if (isNumber(value)) {
    return 0 as EmptyType<T>;
  }
  else if(isBoolean(value)) {
    return false as EmptyType<T>
  }
  else if(Array.isArray(value)) {
    return [] as EmptyType<T>;
  }
  else if(value === null || isObject(value) || isBoolean(value)) {
    return null as EmptyType<T>;
  }

  return undefined as unknown  as EmptyType<T>;
}

export class FieldService<T, P extends FieldProps<T> = FieldProps<T>> implements IField {
  private _emptyValueType: EmptyType<T>;

  validate?: () => Promise<unknown>;
  _serviceType = 'field-service';
  private _initValue!: ValueType<T>;
  private _value!: ValueType<T>;
  private _error?: string = undefined;
  private _disabled = false;
  private _isBlurred = false;

  options: FieldOptionsType<T> = {};

  constructor(initValue: ValueType<T>, options?: FieldOptionsType<T>) {
    makeAutoObservable(this);

    this._emptyValueType = getEmptyValueType(initValue);
    this.initValue = initValue;

    this.options = options || {};
  }

  get initValue() {
    return this._initValue;
  }

  set initValue(initValue: ValueType<T>) {
    if(initValue || initValue === this._emptyValueType){
      this._initValue = initValue;
    }
    else {
      this._initValue = this._emptyValueType;
    }

    this._value = this._initValue;
    this.validate?.();
  }

  get value() {
    return this._value;
  }

  set value(value: ValueType<T>) {
    const result = this.options?.beforeOnChange?.(value);
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
    return this._disabled || Boolean(this.options?.disabledFn?.());
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

  setDisabledFn = (disabledFn: FieldOptionsType<T>['disabledFn']) => {
    this.options.disabledFn = disabledFn;
  }

  setOptions = (options: FieldOptionsType<T>) => {
    this.options = options;
  }

  setValue = (value: ValueType<T>, { validate }: MethodOptions = {}) => {
    this.value = value;

    if(validate) {
      this.validate?.();
    }
  }

  private onChange = (_: any, value: ValueType<T>) => {
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

  clear = () => {
    this.value = this._emptyValueType;
    this.isBlurred = true;
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
