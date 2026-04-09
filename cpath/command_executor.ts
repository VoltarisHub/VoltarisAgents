import { exec } from "child_process"

/**
 * Execute a shell command and return stdout or throw on error.
 * @param command Shell command to run (e.g., "ls -la")
 * @param timeoutMs Optional timeout in milliseconds
 * @param cwd Optional working directory
 * @param env Optional environment variables
 */
export function execCommand(
  command: string,
  timeoutMs: number = 30_000,
  cwd?: string,
  env?: NodeJS.ProcessEnv
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = exec(
      command,
      { timeout: timeoutMs, cwd, env },
      (error, stdout, stderr) => {
        if (error) {
          return reject(new Error(`Command failed: ${stderr || error.message}`))
        }
        if (stderr) {
          console.warn(`stderr: ${stderr}`)
        }
        resolve(stdout.trim())
      }
    )

    proc.on("error", (err) => {
      reject(new Error(`Failed to start command: ${err.message}`))
    })
  })
}

/**
 * Try executing a command safely. Returns result or null on error.
 */
export async function tryExecCommand(
  command: string,
  timeoutMs?: number,
  cwd?: string,
  env?: NodeJS.ProcessEnv
): Promise<string | null> {
  try {
    return await execCommand(command, timeoutMs, cwd, env)
  } catch {
    return null
  }
}
