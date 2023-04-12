// import clone from 'lodash/clone';
// import toPath from 'lodash/toPath';

// import { isInteger, isObject } from './check-types';

// /**
//  * Deeply get a value from an object via its path.
//  */
// export function getIn(obj: any, key: string | string[], def?: any, p = 0) {
//   const path = toPath(key);
//   while (obj && p < path.length) {
//     obj = obj[path[p++]];
//   }
//   return obj === undefined ? def : obj;
// }

// export function setIn(obj: any, path: string, value: any): any {
//   const res: any = clone(obj); // this keeps inheritance when obj is a class
//   let resVal: any = res;
//   let i = 0;
//   const pathArray = toPath(path);

//   for (; i < pathArray.length - 1; i++) {
//     const currentPath: string = pathArray[i];
//     const currentObj: any = getIn(obj, pathArray.slice(0, i + 1));

//     if (currentObj && (isObject(currentObj) || Array.isArray(currentObj))) {
//       resVal = resVal[currentPath] = clone(currentObj);
//     } else {
//       const nextPath: string = pathArray[i + 1];
//       resVal = resVal[currentPath] =
//         isInteger(nextPath) && Number(nextPath) >= 0 ? [] : {};
//     }
//   }

//   // Return original object if new value is the same as current
//   if ((i === 0 ? obj : resVal)[pathArray[i]] === value) {
//     return obj;
//   }

//   if (value === undefined) {
//     delete resVal[pathArray[i]];
//   } else {
//     resVal[pathArray[i]] = value;
//   }

//   // If the path array has a single element, the loop did not run.
//   // Deleting on `resVal` had no effect in this scenario, so we delete on the result instead.
//   if (i === 0 && value === undefined) {
//     delete res[pathArray[i]];
//   }

//   return res;
// }

export {}