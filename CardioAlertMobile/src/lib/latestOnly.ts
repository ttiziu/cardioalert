/**
 * Ejecuta `task` de a una a la vez. Si llegan entradas mientras hay una en curso,
 * se queda solo con la más reciente y la procesa al terminar; las intermedias se
 * descartan. Evita que respuestas lentas se acumulen o lleguen desordenadas.
 *
 * `task` debe manejar sus propios errores; si igual se le escapa uno, se registra
 * para no dejar una promesa rechazada sin manejar.
 */
export function latestOnly<T>(task: (input: T) => Promise<void>): (input: T) => void {
  let running = false;
  let pending: { input: T } | null = null;

  const run = (input: T) => {
    if (running) {
      pending = { input };
      return;
    }
    running = true;
    task(input)
      .catch(error => console.error('latestOnly: la tarea falló', error))
      .finally(() => {
        running = false;
        if (pending) {
          const next = pending.input;
          pending = null;
          run(next);
        }
      });
  };

  return run;
}
