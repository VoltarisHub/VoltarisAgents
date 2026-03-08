import { installJsi, setContextLimit } from 'llama.rn';

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export const initializeBindings = async (retries = 3, delayMs = 60): Promise<void> => {
  let lastError: unknown;
  for (let i = 0; i < retries; i += 1) {
    try {
      await installJsi();
      await setContextLimit(2);
      return;
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        await wait(delayMs);
      }
    }
  }
  throw lastError;
};
