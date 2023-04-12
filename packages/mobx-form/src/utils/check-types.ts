export const isObject = (obj: unknown): obj is Record<string, unknown> =>
  obj !== null && typeof obj === 'object';

export const isInteger = (obj: unknown): boolean =>
  String(Math.floor(Number(obj))) === obj;

export const isString = (obj: unknown): boolean => typeof obj === 'string';

export const isBlob = (obj: unknown): boolean => obj instanceof Blob;

export const isFile = (obj: unknown): boolean => obj instanceof File;

export const isNumber = (value: unknown): boolean => typeof value === 'number';

export const isBoolean = (value: unknown): boolean =>
  typeof value === 'boolean';