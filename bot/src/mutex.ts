export function createMutex() {
  let tail: Promise<unknown> = Promise.resolve();

  return function lock<T>(fn: () => Promise<T>): Promise<T> {
    const run = tail.then(fn, fn);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}

const phoneTails = new Map<string, Promise<unknown>>();

export function lockPhone<T>(phone: string, fn: () => Promise<T>): Promise<T> {
  const previous = phoneTails.get(phone) ?? Promise.resolve();
  const run = previous.then(fn, fn);
  phoneTails.set(
    phone,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}
