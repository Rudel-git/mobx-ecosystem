export const isObject = (obj: unknown): obj is Record<string, unknown> =>
  obj !== null && typeof obj === 'object';

export const isInteger = (obj: unknown): obj is number & boolean =>
  String(Math.floor(Number(obj))) === obj;

export const isString = (obj: unknown): obj is string & boolean => typeof obj === 'string';

export const isBlob = (obj: unknown): boolean => obj instanceof Blob;

export const isFile = (obj: unknown): boolean => obj instanceof File;

export const isNumber = (value: unknown): boolean => typeof value === 'number';

export const isBoolean = (value: unknown): value is boolean & boolean =>
  typeof value === 'boolean';

export const isUndefined = (value: unknown) => value === undefined;