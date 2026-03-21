export interface LogMetadata {
  model?: string;
  messages?: Array<{ role: string; content: string }>;
  response?: string;
  params?: Record<string, any>;
  duration?: number;
  stream?: boolean;
  endpoint?: string;
  status?: number;
}

export interface LogEntry {
  timestamp: number;
  level: string;
  msg: string;
  category?: string;
  metadata?: LogMetadata;
}

class ServerLogger {
  private logEntries: LogEntry[] = [];
  private maxLogs = 1000;

  constructor() {
  }

  private addLogEntry(level: string, message: string, category: string = 'server', metadata?: LogMetadata) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      msg: message,
      category,
      ...(metadata ? { metadata } : {}),
    };

    this.logEntries.unshift(entry);

    if (this.logEntries.length > this.maxLogs) {
      this.logEntries = this.logEntries.slice(0, this.maxLogs);
    }

    if (__DEV__) {
      const timestamp = new Date().toLocaleTimeString();
      const prefix = `[${timestamp}] [${level.toUpperCase()}] [${category}]`;
      console.log(`${prefix} ${message}`);
    }
  }

  debug(message: string, category?: string) {
    this.addLogEntry('debug', message, category);
  }

  info(message: string, category?: string) {
    this.addLogEntry('info', message, category);
  }

  warn(message: string, category?: string) {
    this.addLogEntry('warn', message, category);
  }

  error(message: string, category?: string) {
    this.addLogEntry('error', message, category);
  }

  async getLogs(): Promise<LogEntry[]> {
    return [...this.logEntries];
  }

  async clearLogs(): Promise<void> {
    this.logEntries = [];
    this.info('logs_cleared', 'system');
  }

  logInference(data: {
    model: string;
    endpoint: string;
    messages: Array<{ role: string; content: string }>;
    params?: Record<string, any>;
    stream?: boolean;
    response?: string;
    duration?: number;
    status?: number;
  }) {
    const label = data.response ? 'inference_complete' : 'inference_request';
    const meta: LogMetadata = {
      model: data.model,
      endpoint: data.endpoint,
      messages: data.messages,
      params: data.params,
      stream: data.stream,
      response: data.response,
      duration: data.duration,
      status: data.status,
    };
    this.addLogEntry('info', `${label} model:${data.model} endpoint:${data.endpoint}`, 'inference', meta);
  }

  logServerStart(port: number, url: string) {
    this.info(`server_started port:${port} url:${url}`, 'server');
  }

  logServerStop() {
    this.info('server_stopped', 'server');
  }

  logServerError(error: string) {
    this.error(`server_error: ${error}`, 'server');
  }

  logModelInitialization(modelPath: string, success: boolean) {
    const status = success ? 'success' : 'failed';
    this.info(`model_initialization_${status}: ${modelPath}`, 'model');
  }

  logWebRequest(method: string, path: string, status: number) {
    this.info(`${method} ${path} ${status}`, 'http');
  }

  logClientConnection(connected: boolean, clientInfo?: string) {
    const action = connected ? 'connected' : 'disconnected';
    const info = clientInfo ? ` ${clientInfo}` : '';
    this.info(`client_${action}${info}`, 'client');
  }
}

export const logger = new ServerLogger();
