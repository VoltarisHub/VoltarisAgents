import { engineService } from '../../inference-engine-service';
import { modelDownloader } from '../../ModelDownloader';
import { logger } from '../../../utils/logger';
import { parseJsonBody } from './jsonParser';
import { parseMessagesFromPayload } from './messageParser';
import { buildCustomSettings } from './settingsBuilder';
import { sendSSEStart, writeSSEEvent, endSSEStream } from './responseUtils';
import { appleFoundationService } from '../../AppleFoundationService';
import type { StoredModel } from '../../ModelDownloaderTypes';
import type { ModelSettings } from '../../ModelSettingsService';
import type { AppleFoundationMessage } from '../../AppleFoundationService';
import { onlineModelService } from '../../OnlineModelService';
import type { ChatMessage as RemoteChatMessage, OnlineModelRequestOptions } from '../../OnlineModelService';
import providerKeyStorage from '../../../utils/ProviderKeyStorage';

type RemoteProvider = 'gemini' | 'chatgpt' | 'claude';
const REMOTE_PROVIDERS: RemoteProvider[] = ['gemini', 'chatgpt', 'claude'];
const REMOTE_MODELS_PREF_KEY = 'remote_models_enabled';

function genId(): string {
  return `chatcmpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isRemoteProvider(value?: string): value is RemoteProvider {
  if (!value) return false;
  return REMOTE_PROVIDERS.includes(value as RemoteProvider);
}

async function remoteModelsEnabled(): Promise<boolean> {
  try {
    await providerKeyStorage.initialize();
    const value = await providerKeyStorage.getPreference(REMOTE_MODELS_PREF_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

function mapAppleMessages(messages: { role: string; content: string }[]): AppleFoundationMessage[] {
  return messages.map(item => {
    const role: AppleFoundationMessage['role'] = item.role === 'system' ? 'system' : item.role === 'assistant' ? 'assistant' : 'user';
    return { role, content: item.content };
  });
}

function mapRemoteMessages(messages: { role: string; content: string }[]): RemoteChatMessage[] {
  return messages.map((item, index) => {
    const role: RemoteChatMessage['role'] = item.role === 'system' ? 'system' : item.role === 'assistant' ? 'assistant' : 'user';
    return { id: `msg-${index}`, role, content: item.content };
  });
}

function buildSettings(payload: any): ModelSettings | undefined {
  const opts: any = {};
  if (payload.temperature != null) opts.temperature = payload.temperature;
  if (payload.top_p != null) opts.top_p = payload.top_p;
  if (payload.max_tokens != null) opts.max_tokens = payload.max_tokens;
  if (payload.frequency_penalty != null) opts.frequency_penalty = payload.frequency_penalty;
  if (payload.presence_penalty != null) opts.presence_penalty = payload.presence_penalty;
  if (payload.stop != null) opts.stop = payload.stop;
  if (payload.seed != null) opts.seed = payload.seed;
  return buildCustomSettings(opts);
}

function buildSSEChunk(id: string, model: string, content: string, finishReason: string | null): any {
  return {
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index: 0,
      delta: content ? { content } : {},
      finish_reason: finishReason,
    }],
  };
}

function buildCompletion(id: string, model: string, content: string): any {
  return {
    id,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index: 0,
      message: { role: 'assistant', content },
      finish_reason: 'stop',
    }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

async function streamAppleSSE(
  socket: any,
  method: string,
  path: string,
  id: string,
  messages: { role: string; content: string }[],
  settings?: ModelSettings
) {
  const mapped = mapAppleMessages(messages);
  const options = {
    temperature: settings?.temperature,
    maxTokens: settings?.maxTokens,
    topP: settings?.topP,
    topK: settings?.topK,
  };

  try {
    sendSSEStart(socket, 200);
  } catch {
    try { socket.destroy(); } catch {}
    logger.logWebRequest(method, path, 500);
    return;
  }

  try {
    for await (const chunk of appleFoundationService.streamResponse(mapped, options)) {
      try {
        writeSSEEvent(socket, buildSSEChunk(id, 'apple-foundation', chunk, null));
      } catch {
        appleFoundationService.cancel();
        throw new Error('write_failed');
      }
    }
    writeSSEEvent(socket, buildSSEChunk(id, 'apple-foundation', '', 'stop'));
    endSSEStream(socket);
    logger.logWebRequest(method, path, 200);
  } catch {
    try { endSSEStream(socket); } catch { try { socket.destroy(); } catch {} }
    logger.logWebRequest(method, path, 500);
  }
}

async function streamRemoteSSE(
  provider: RemoteProvider,
  socket: any,
  method: string,
  path: string,
  id: string,
  messages: { role: string; content: string }[],
  settings?: ModelSettings
) {
  try {
    sendSSEStart(socket, 200);
  } catch {
    try { socket.destroy(); } catch {}
    logger.logWebRequest(method, path, 500);
    return;
  }

  const mapped = mapRemoteMessages(messages);
  const options: OnlineModelRequestOptions = {
    temperature: settings?.temperature,
    maxTokens: settings?.maxTokens,
    topP: settings?.topP,
    stream: true,
    streamTokens: true,
  };

  try {
    const sendFn = provider === 'gemini'
      ? onlineModelService.sendMessageToGemini.bind(onlineModelService)
      : provider === 'chatgpt'
        ? onlineModelService.sendMessageToOpenAI.bind(onlineModelService)
        : onlineModelService.sendMessageToClaude.bind(onlineModelService);

    await sendFn(mapped, options, (token: string) => {
      try {
        writeSSEEvent(socket, buildSSEChunk(id, provider, token, null));
      } catch { return false; }
      return true;
    });

    writeSSEEvent(socket, buildSSEChunk(id, provider, '', 'stop'));
    endSSEStream(socket);
    logger.logWebRequest(method, path, 200);
  } catch {
    try { endSSEStream(socket); } catch { try { socket.destroy(); } catch {} }
    logger.logWebRequest(method, path, 500);
  }
}

export async function handleOpenAIChatCompletions(
  body: string,
  socket: any,
  method: string,
  path: string,
  ensureModelLoaded: (identifier?: string) => Promise<{ model: StoredModel; projectorPath?: string }>,
  parseHttpError: (error: unknown) => { status: number; code: string; message: string },
  sendJSONResponse: (socket: any, status: number, payload: any) => void
): Promise<void> {
  const { payload, error: parseError } = parseJsonBody(body);
  if (parseError) {
    sendJSONResponse(socket, 400, { error: { message: parseError, type: 'invalid_request_error' } });
    logger.logWebRequest(method, path, 400);
    return;
  }

  const parsed = parseMessagesFromPayload(payload);
  if (parsed.error) {
    sendJSONResponse(socket, 400, { error: { message: parsed.error, type: 'invalid_request_error' } });
    logger.logWebRequest(method, path, 400);
    return;
  }

  const modelId = typeof payload.model === 'string' ? payload.model : undefined;
  const stream = payload.stream === true;
  const settings = buildSettings(payload);
  const id = genId();

  if (modelId === 'apple-foundation') {
    const available = appleFoundationService.isAvailable();
    const enabled = available ? await appleFoundationService.isEnabled() : false;
    if (!available || !enabled) {
      sendJSONResponse(socket, 503, { error: { message: 'apple_foundation_not_available', type: 'server_error' } });
      logger.logWebRequest(method, path, 503);
      return;
    }

    if (stream) {
      await streamAppleSSE(socket, method, path, id, parsed.messages, settings);
      return;
    }

    try {
      const mapped = mapAppleMessages(parsed.messages);
      const options = { temperature: settings?.temperature, maxTokens: settings?.maxTokens, topP: settings?.topP, topK: settings?.topK };
      const text = await appleFoundationService.generateResponse(mapped, options);
      sendJSONResponse(socket, 200, buildCompletion(id, 'apple-foundation', text));
      logger.logWebRequest(method, path, 200);
    } catch {
      sendJSONResponse(socket, 500, { error: { message: 'generation_failed', type: 'server_error' } });
      logger.logWebRequest(method, path, 500);
    }
    return;
  }

  if (isRemoteProvider(modelId)) {
    const enabled = await remoteModelsEnabled();
    if (!enabled) {
      sendJSONResponse(socket, 409, { error: { message: 'remote_models_disabled', type: 'server_error' } });
      logger.logWebRequest(method, path, 409);
      return;
    }
    const hasKey = await onlineModelService.hasApiKey(modelId);
    if (!hasKey) {
      sendJSONResponse(socket, 422, { error: { message: 'api_key_missing', type: 'server_error' } });
      logger.logWebRequest(method, path, 422);
      return;
    }

    if (stream) {
      await streamRemoteSSE(modelId, socket, method, path, id, parsed.messages, settings);
      return;
    }

    try {
      const mapped = mapRemoteMessages(parsed.messages);
      const options: OnlineModelRequestOptions = { temperature: settings?.temperature, maxTokens: settings?.maxTokens, topP: settings?.topP, stream: false, streamTokens: false };
      const sendFn = modelId === 'gemini'
        ? onlineModelService.sendMessageToGemini.bind(onlineModelService)
        : modelId === 'chatgpt'
          ? onlineModelService.sendMessageToOpenAI.bind(onlineModelService)
          : onlineModelService.sendMessageToClaude.bind(onlineModelService);
      const text = await sendFn(mapped, options);
      sendJSONResponse(socket, 200, buildCompletion(id, modelId, text as string));
      logger.logWebRequest(method, path, 200);
    } catch {
      sendJSONResponse(socket, 500, { error: { message: 'generation_failed', type: 'server_error' } });
      logger.logWebRequest(method, path, 500);
    }
    return;
  }

  let target: { model: StoredModel; projectorPath?: string };
  try {
    target = await ensureModelLoaded(modelId);
  } catch (error) {
    const err = parseHttpError(error);
    sendJSONResponse(socket, err.status, { error: { message: err.code, type: 'server_error' } });
    logger.logWebRequest(method, path, err.status);
    return;
  }

  if (stream) {
    try {
      sendSSEStart(socket, 200);
    } catch {
      try { socket.destroy(); } catch {}
      logger.logWebRequest(method, path, 500);
      return;
    }

    try {
      await engineService.mgr().gen(
        parsed.messages as any,
        {
          onToken: (token: string) => {
            try {
              writeSSEEvent(socket, buildSSEChunk(id, target.model.name, token, null));
            } catch { return false; }
            return true;
          },
          settings,
        }
      );
      writeSSEEvent(socket, buildSSEChunk(id, target.model.name, '', 'stop'));
      endSSEStream(socket);
      logger.logWebRequest(method, path, 200);
    } catch {
      try { endSSEStream(socket); } catch { try { socket.destroy(); } catch {} }
      logger.logWebRequest(method, path, 500);
    }
    return;
  }

  try {
    const text = await engineService.mgr().gen(parsed.messages as any, { settings });
    sendJSONResponse(socket, 200, buildCompletion(id, target.model.name, text as string));
    logger.logWebRequest(method, path, 200);
  } catch {
    sendJSONResponse(socket, 500, { error: { message: 'generation_failed', type: 'server_error' } });
    logger.logWebRequest(method, path, 500);
  }
}

export async function handleOpenAIModels(
  socket: any,
  method: string,
  path: string,
  sendJSONResponse: (socket: any, status: number, payload: any) => void
): Promise<void> {
  try {
    const stored = await modelDownloader.getStoredModels();
    const data: any[] = stored.map(m => ({
      id: m.name,
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'local',
    }));

    try {
      const afAvailable = appleFoundationService.isAvailable();
      const afEnabled = afAvailable ? await appleFoundationService.isEnabled() : false;
      if (afAvailable && afEnabled) {
        data.push({ id: 'apple-foundation', object: 'model', created: Math.floor(Date.now() / 1000), owned_by: 'apple' });
      }
    } catch {}

    try {
      const enabled = await remoteModelsEnabled();
      if (enabled) {
        for (const provider of REMOTE_PROVIDERS) {
          const hasKey = await onlineModelService.hasApiKey(provider);
          if (hasKey) {
            data.push({ id: provider, object: 'model', created: Math.floor(Date.now() / 1000), owned_by: 'remote' });
          }
        }
      }
    } catch {}

    sendJSONResponse(socket, 200, { object: 'list', data });
    logger.logWebRequest(method, path, 200);
  } catch {
    sendJSONResponse(socket, 500, { error: { message: 'failed_to_list_models', type: 'server_error' } });
    logger.logWebRequest(method, path, 500);
  }
}
