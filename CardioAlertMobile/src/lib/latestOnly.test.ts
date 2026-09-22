import { latestOnly } from './latestOnly';

/** Deja correr las promesas pendientes. */
const flush = () => new Promise<void>(resolve => setImmediate(() => resolve()));

/** Tarea controlable: cada llamada queda en espera hasta `finish()`. */
function controllableTask() {
  const started: number[] = [];
  const resolvers: Array<() => void> = [];
  const task = (n: number) =>
    new Promise<void>(resolve => {
      started.push(n);
      resolvers.push(resolve);
    });
  const finish = async () => {
    resolvers.shift()?.();
    await flush();
  };
  return { started, task, finish };
}

describe('latestOnly', () => {
  it('no ejecuta dos tareas a la vez', () => {
    const { started, task } = controllableTask();
    const run = latestOnly(task);
    run(1);
    run(2);
    expect(started).toEqual([1]);
  });

  it('al terminar procesa solo la entrada más reciente', async () => {
    const { started, task, finish } = controllableTask();
    const run = latestOnly(task);
    run(1);
    run(2);
    run(3);
    await finish();
    expect(started).toEqual([1, 3]);
  });

  it('sigue funcionando aunque una tarea falle', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const started: number[] = [];
    const run = latestOnly(async (n: number) => {
      started.push(n);
      if (n === 1) throw new Error('fallo de red');
    });
    run(1);
    await flush();
    run(2);
    await flush();
    expect(started).toEqual([1, 2]);
    expect(log).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });
});
