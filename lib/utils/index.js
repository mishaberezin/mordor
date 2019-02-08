// Бесконечный итератор по массиву,
// 0 → 1 → 2 → 0 → 1 → 2 → 0 → ...
const neverend = function*(arr) {
  for (let i = 0; true; i = (i + 1) % arr.length) {
    yield arr[i];
  }
};

const sleep = async ms => {
  await new Promise(resolve => setTimeout(resolve, ms));
};

// Таймер для тротлинга на await'ах.
// Первый резолв без задержки, затем резолвится через ms после предыдущего резолва.
const timeloop = ms => {
  let loop = Promise.resolve();
  return async () => {
    const _loop = loop;
    return loop.then(() => {
      if (loop === _loop) {
        loop = sleep(ms);
      }
    });
  };
};

module.exports = {
  neverend,
  sleep,
  timeloop
};
