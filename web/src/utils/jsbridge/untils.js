/**
 * 对象合并（类似 jQuery.extend）
 * @param {boolean} [deep=false] - 是否深拷贝
 * @param {Object} target - 目标对象
 * @param {...Object} objects - 需要合并的对象
 * @returns {Object} 合并后的目标对象
 */
export function extend() {
  let args = sliceArgs(arguments);
  let target = args[0] || {};
  let startIndex = 1;
  let length = args.length;
  let deep = false;

  // 如果第一个参数是布尔值，表示是否需要深拷贝
  if (typeof target === "boolean") {
    deep = target;
    target = args[startIndex] || {};
    startIndex++;
  }

  // 如果目标不是对象或函数，初始化为空对象
  if (typeof target !== "object" && typeof target !== "function") {
    target = {};
  }

  // 如果只有一个参数，将 this 作为目标对象
  if (startIndex === length) {
    target = this || {};
    startIndex--;
  }

  for (; startIndex < length; startIndex++) {
    let source = args[startIndex];
    if (source != null) {
      for (let key in source) {
        let copy = source[key];

        // 防止圆形引用
        if (target === copy) {
          continue;
        }

        if (deep && copy && (isPlainObject(copy) || isArray(copy))) {
          let clone = target[key];
          const cloneIsArray = isArray(copy);
          let copyIsArray = isArray(copy) && cloneIsArray;
          let cloneEmpty = cloneIsArray
            ? Array.isArray(clone)
            : isPlainObject(clone);

          if (copyIsArray || cloneEmpty) {
            if (copyIsArray) {
              copyIsArray = false;
              clone = clone || [];
            } else {
              clone = clone && isPlainObject(clone) ? clone : {};
            }
            target[key] = extend(deep, clone, copy);
          } else if (copy && isPlainObject(copy)) {
            target[key] = extend(deep, {}, copy);
          } else {
            target[key] = copy;
          }
        } else if (copy !== undefined) {
          target[key] = copy;
        }
      }
    }
  }

  return target;
}


function sliceArgs(args) {
  if (args.length === 1) {
    return [args[0]];
  }
  return Array.from(args);
}

function isPlainObject(obj) {
  return Object.prototype.toString.call(obj) === "[object Object]";
}

function isArray(obj) {
  return Object.prototype.toString.call(obj) === "[object Array]";
}