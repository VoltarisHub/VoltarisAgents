import { OnlineModel } from './ModelSelector.types';

export const ONLINE_MODELS: OnlineModel[] = [
  { id: 'gemini', name: 'Gemini', provider: 'Google', isOnline: true },
  { id: 'chatgpt', name: 'ChatGPT', provider: 'OpenAI', isOnline: true },
  { id: 'claude', name: 'Claude', provider: 'Anthropic', isOnline: true },
];
