export function isString(v) {
  return typeof v === "string";
}

/**
 * @param {unknown} value - The value to check.
 * @returns {value is Record<string, any>} - Whether the value is a plain object.
 */
export function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
