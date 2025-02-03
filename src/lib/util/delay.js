export function delay(fn, ms) {
  let timer;
  return function (...args) {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(fn.bind(this, ...args), ms || 0);
  };
}
