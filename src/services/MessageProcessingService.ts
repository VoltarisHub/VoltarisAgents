import { ChatMessage } from '../utils/ChatManager';
import { engineService } from './inference-engine-service';
import { onlineModelService, OnlineModelService } from './OnlineModelService';
import chatManager from '../utils/ChatManager';
import { generateRandomId } from '../utils/homeScreenUtils';
import { appleFoundationService } from './AppleFoundationService';
import type { ProviderType } from './ModelManagementService';
import { RAGService } from './rag/RAGService';
import type { Message as RAGMessage } from 'react-native-rag';

export interface MessageProcessingCallbacks {
  setMessages: (messages: ChatMessage[]) => void;
  setStreamingMessageId: (id: string | null) => void;
  setStreamingMessage: (message: string) => void;
  setStreamingThinking: (thinking: string) => void;
  setStreamingStats: (stats: { tokens: number; duration: number; firstTokenTime?: number; avgTokenTime?: number } | null) => void;
  setIsStreaming: (streaming: boolean) => void;
  setIsRegenerating: (regenerating: boolean) => void;
  saveMessagesImmediate: (messages: ChatMessage[]) => Promise<void>;
  saveMessages: (messages: ChatMessage[]) => void;
  saveMessagesDebounced: { cancel: () => void };
  updateMessageContentDebounced: (messageId: string, content: string, thinking: string, stats: any) => void;
  handleApiError: (error: unknown, provider: 'Gemini' | 'OpenAI' | 'Claude') => void;
}

export class MessageProcessingService {
  private cancelGenerationRef: React.MutableRefObject<boolean>;
  private callbacks: MessageProcessingCallbacks;

  constructor(cancelGenerationRef: React.MutableRefObject<boolean>, callbacks: MessageProcessingCallbacks) {
    this.cancelGenerationRef = cancelGenerationRef;
    this.callbacks = callbacks;
  }

  async processMessage(
    activeProvider: ProviderType | null,
    settings: any
  ): Promise<void> {
    const currentChat = chatManager.getCurrentChat();
    if (!currentChat) return;

    try {
      this.callbacks.setIsRegenerating(true);
      
      const currentMessages = currentChat.messages;
      const isOnlineModel = !!activeProvider && ['gemini','chatgpt','claude'].includes(OnlineModelService.getBaseProvider(activeProvider));
      const isAppleFoundation = activeProvider === 'apple-foundation';

      const fallbackSystemPrompt = settings.systemPrompt || 'You are a helpful AI assistant.';
      let systemPrompt = fallbackSystemPrompt;
      if (isOnlineModel && activeProvider) {
        const providerSystemInstruction = await onlineModelService.getSystemInstruction(activeProvider);
        if (providerSystemInstruction && providerSystemInstruction.trim()) {
          systemPrompt = providerSystemInstruction.trim();
        }
      }

      const processedMessages = isOnlineModel
        ? [{ role: 'system', content: systemPrompt, id: 'system-prompt' }, ...currentMessages.filter(msg => msg.role !== 'system')]
        : currentMessages.some(msg => msg.role === 'system')
          ? currentMessages
          : [{ role: 'system', content: systemPrompt, id: 'system-prompt' }, ...currentMessages];
      const skipRag = this.shouldSkipRag(processedMessages) || await this.shouldSkipRagForInput(processedMessages);
      const responderModelName = await this.resolveResponderModelName(activeProvider);
      if (responderModelName) {
        console.log('resp_model', responderModelName);
      }
      
      const assistantMessage: Omit<ChatMessage, 'id'> = {
        role: 'assistant',
        content: '',
        modelName: responderModelName,
        stats: {
          duration: 0,
          tokens: 0,
        }
      };
      
      await chatManager.addMessage(assistantMessage);
      const updatedChat = chatManager.getCurrentChat();
      if (!updatedChat) return;

      this.callbacks.setMessages([...updatedChat.messages]);

      const lastMessage = updatedChat.messages.slice(-1)[0];
      if (!lastMessage) return;
      
      const messageId = lastMessage.id;
      
      this.callbacks.setStreamingMessageId(messageId);
      this.callbacks.setStreamingMessage('');
      this.callbacks.setStreamingThinking('');
      this.callbacks.setStreamingStats({ tokens: 0, duration: 0 });
      this.callbacks.setIsStreaming(true);
      
      const startTime = Date.now();
      let tokenCount = 0;
      let fullResponse = '';
      let thinking = '';
      let isThinking = false;
      let firstTokenTime: number | null = null;
      this.cancelGenerationRef.current = false;
      
      let updateCounter = 0;

      if (isOnlineModel) {
        await this.processOnlineModel(
          activeProvider,
          processedMessages,
          settings,
          messageId,
          startTime,
          tokenCount,
          fullResponse,
          firstTokenTime,
          updateCounter
        );
      } else if (isAppleFoundation) {
        await this.processAppleFoundationModel(
          processedMessages,
          settings,
          messageId,
          startTime,
          skipRag
        );
      } else {
        await this.processLocalModel(
          processedMessages,
          settings,
          messageId,
          startTime,
          tokenCount,
          fullResponse,
          thinking,
          isThinking,
          firstTokenTime,
          updateCounter,
          skipRag
        );
      }
      
      this.callbacks.setIsStreaming(false);
      this.callbacks.setStreamingMessageId(null);
      this.callbacks.setStreamingThinking('');
      this.callbacks.setStreamingStats(null);
      this.callbacks.setIsRegenerating(false);
      
    } catch (error) {
      this.callbacks.setIsStreaming(false);
      this.callbacks.setStreamingMessageId(null);
      this.callbacks.setStreamingThinking('');
      this.callbacks.setStreamingStats(null);
      this.callbacks.setIsRegenerating(false);
      throw error;
    }
  }

  private async processOnlineModel(
    activeProvider: string,
    processedMessages: any[],
    settings: any,
    messageId: string,
    startTime: number,
    tokenCount: number,
    fullResponse: string,
    firstTokenTime: number | null,
    updateCounter: number
  ): Promise<void> {
    const streamCallback = (token: string) => {
      if (this.cancelGenerationRef.current) {
        return false;
      }
      
      const currentTime = Date.now();
      
      if (firstTokenTime === null && token.trim().length > 0) {
        firstTokenTime = currentTime - startTime;
      }
      
      tokenCount++;
      fullResponse += token;
      
      const duration = (currentTime - startTime) / 1000;
      let avgTokenTime = undefined;
      
      if (firstTokenTime !== null && tokenCount > 0) {
        const timeAfterFirstToken = currentTime - (startTime + firstTokenTime);
        avgTokenTime = timeAfterFirstToken / tokenCount;
      }
      
      this.callbacks.setStreamingMessage(fullResponse);
      this.callbacks.setStreamingStats({
        tokens: tokenCount,
        duration: duration,
        firstTokenTime: firstTokenTime || undefined,
        avgTokenTime: avgTokenTime && avgTokenTime > 0 ? avgTokenTime : undefined
      });
      
      updateCounter++;
      if (updateCounter % 10 === 0 || 
          fullResponse.endsWith('.') || 
          fullResponse.endsWith('!') || 
          fullResponse.endsWith('?')) {
        let debouncedAvgTokenTime = undefined;
        if (firstTokenTime !== null && tokenCount > 0) {
          const timeAfterFirstToken = Date.now() - (startTime + firstTokenTime);
          debouncedAvgTokenTime = timeAfterFirstToken / tokenCount;
        }
        
        this.callbacks.updateMessageContentDebounced(
          messageId,
          fullResponse,
          '',
          {
            duration: (Date.now() - startTime) / 1000,
            tokens: tokenCount,
            firstTokenTime: firstTokenTime || undefined,
            avgTokenTime: debouncedAvgTokenTime && debouncedAvgTokenTime > 0 ? debouncedAvgTokenTime : undefined
          }
        );
      }
      
      return !this.cancelGenerationRef.current;
    };

    const baseMessages = processedMessages.map(msg => {
      let content = msg.content;
      
      try {
        const parsed = JSON.parse(msg.content);
        
        if (parsed && parsed.type === 'ocr_result') {
          if (parsed.metadata?.ragDocumentId) {
            const fileName = parsed.fileName ? ` from ${parsed.fileName}` : '';
            const userPrompt = parsed.userPrompt || 'Please process this extracted text';
            content = `User uploaded an image${fileName} and extracted text from it. The text has been stored for retrieval.\n\nUser request: ${userPrompt}`;
          } else {
            const instruction = parsed.internalInstruction || '';
            const userPrompt = parsed.userPrompt || '';
            content = `${instruction}\n\nUser request: ${userPrompt}`;
          }
        } else if (parsed && parsed.type === 'file_upload') {
          if (parsed.metadata?.ragDocumentId) {
            const fileName = parsed.fileName || 'a file';
            const userContent = parsed.userContent || `File uploaded: ${fileName}`;
            content = `User uploaded ${fileName}. The content has been stored for retrieval.\n\nUser request: ${userContent}`;
          } else {
            content = parsed.internalInstruction || msg.content;
          }
        }
      } catch {
      }
      
      return { role: msg.role, content };
    }) as RAGMessage[];

    const legacyStreamCallback = (partialResponse: string) => {
      if (this.cancelGenerationRef.current) {
        return false;
      }
      
      const currentTime = Date.now();
      
      if (firstTokenTime === null && partialResponse.trim().length > 0) {
        firstTokenTime = currentTime - startTime;
      }
      
      const wordCount = partialResponse.trim().split(/\s+/).filter(word => word.length > 0).length;
      tokenCount = Math.max(1, Math.ceil(wordCount * 1.33));
      fullResponse = partialResponse;
      
      const duration = (currentTime - startTime) / 1000;
      let avgTokenTime = undefined;
      
      if (firstTokenTime !== null && tokenCount > 0) {
        const timeAfterFirstToken = currentTime - (startTime + firstTokenTime);
        avgTokenTime = timeAfterFirstToken / tokenCount;
      }
      
      this.callbacks.setStreamingMessage(partialResponse);
      this.callbacks.setStreamingStats({
        tokens: tokenCount,
        duration: duration,
        firstTokenTime: firstTokenTime || undefined,
        avgTokenTime: avgTokenTime && avgTokenTime > 0 ? avgTokenTime : undefined
      });
      
      updateCounter++;
      if (updateCounter % 10 === 0 || 
          partialResponse.endsWith('.') || 
          partialResponse.endsWith('!') || 
          partialResponse.endsWith('?')) {
        let debouncedAvgTokenTime = undefined;
        if (firstTokenTime !== null && tokenCount > 0) {
          const timeAfterFirstToken = Date.now() - (startTime + firstTokenTime);
          debouncedAvgTokenTime = timeAfterFirstToken / tokenCount;
        }
        
        this.callbacks.updateMessageContentDebounced(
          messageId,
          partialResponse,
          '',
          {
            duration: (Date.now() - startTime) / 1000,
            tokens: tokenCount,
            firstTokenTime: firstTokenTime || undefined,
            avgTokenTime: debouncedAvgTokenTime && debouncedAvgTokenTime > 0 ? debouncedAvgTokenTime : undefined
          }
        );
      }
      
      return !this.cancelGenerationRef.current;
    };

    const messageParams = [...baseMessages]
      .filter(msg => msg.content.trim() !== '')
      .map(msg => ({ 
        id: generateRandomId(), 
        role: msg.role as 'system' | 'user' | 'assistant', 
        content: msg.content 
      }));

    const apiParams = {
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      topP: settings.topP,
      stream: true,
      streamTokens: true
    };

    try {
      await onlineModelService.sendMessage(activeProvider, messageParams, apiParams, legacyStreamCallback);
    } catch (error) {
      this.callbacks.handleApiError(error, this.getProviderDisplayName(activeProvider));
      
      await chatManager.updateMessageContent(
        messageId,
        'Sorry, an error occurred while generating a response. Please try again.',
        '',
        { duration: 0, tokens: 0 }
      );
      return;
    }
    
    if (!this.cancelGenerationRef.current) {
      let finalAvgTokenTime = undefined;
      if (firstTokenTime !== null && tokenCount > 0) {
        const timeAfterFirstToken = Date.now() - (startTime + firstTokenTime);
        finalAvgTokenTime = timeAfterFirstToken / tokenCount;
      }
      
      await chatManager.updateMessageContent(
        messageId,
        fullResponse,
        '',
        {
          duration: (Date.now() - startTime) / 1000,
          tokens: tokenCount,
          firstTokenTime: firstTokenTime || undefined,
          avgTokenTime: finalAvgTokenTime && finalAvgTokenTime > 0 ? finalAvgTokenTime : undefined
        }
      );
    }
  }

  private async processAppleFoundationModel(
    processedMessages: any[],
    settings: any,
    messageId: string,
    startTime: number,
    skipRag: boolean
  ): Promise<void> {
    let fullResponse = '';
    let tokenCount = 0;
    let firstTokenTime: number | null = null;
    let updateCounter = 0;

    const streamCallback = (token: string) => {
      if (this.cancelGenerationRef.current) {
        return false;
      }

      if (firstTokenTime === null && token.trim().length > 0) {
        firstTokenTime = Date.now() - startTime;
      }

      fullResponse += token;
      const wordCount = fullResponse.trim().split(/\s+/).filter(word => word.length > 0).length;
      tokenCount = Math.max(1, Math.ceil(wordCount * 1.33));

      const duration = (Date.now() - startTime) / 1000;
      let avgTokenTime = undefined;

      if (firstTokenTime !== null && tokenCount > 0) {
        const timeAfterFirstToken = Date.now() - (startTime + firstTokenTime);
        avgTokenTime = timeAfterFirstToken / tokenCount;
      }

      this.callbacks.setStreamingMessage(fullResponse);
      this.callbacks.setStreamingStats({
        tokens: tokenCount,
        duration,
        firstTokenTime: firstTokenTime || undefined,
        avgTokenTime: avgTokenTime && avgTokenTime > 0 ? avgTokenTime : undefined,
      });

      updateCounter++;
      if (
        updateCounter % 10 === 0 ||
        fullResponse.endsWith('.') ||
        fullResponse.endsWith('!') ||
        fullResponse.endsWith('?')
      ) {
        let debouncedAvgTokenTime = undefined;
        if (firstTokenTime !== null && tokenCount > 0) {
          const timeAfterFirstToken = Date.now() - (startTime + firstTokenTime);
          debouncedAvgTokenTime = timeAfterFirstToken / tokenCount;
        }

        this.callbacks.updateMessageContentDebounced(
          messageId,
          fullResponse,
          '',
          {
            duration,
            tokens: tokenCount,
            firstTokenTime: firstTokenTime || undefined,
            avgTokenTime: debouncedAvgTokenTime && debouncedAvgTokenTime > 0 ? debouncedAvgTokenTime : undefined,
          }
        );
      }

      return !this.cancelGenerationRef.current;
    };

    const baseMessages = processedMessages.map(msg => {
      let content = msg.content;
      
      try {
        const parsed = JSON.parse(msg.content);
        
        if (parsed && parsed.type === 'ocr_result') {
          if (parsed.metadata?.ragDocumentId) {
            const fileName = parsed.fileName ? ` from ${parsed.fileName}` : '';
            const userPrompt = parsed.userPrompt || 'Please process this extracted text';
            content = `User uploaded an image${fileName} and extracted text from it. The text has been stored for retrieval.\n\nUser request: ${userPrompt}`;
          } else {
            const instruction = parsed.internalInstruction || '';
            const userPrompt = parsed.userPrompt || '';
            content = instruction + (userPrompt ? `\n\n${userPrompt}` : '');
          }
        } else if (parsed && parsed.type === 'file_upload') {
          if (parsed.metadata?.ragDocumentId) {
            const fileName = parsed.fileName || 'a file';
            const userContent = parsed.userContent || `File uploaded: ${fileName}`;
            content = `User uploaded ${fileName}. The content has been stored for retrieval.\n\nUser request: ${userContent}`;
          } else {
            const instruction = parsed.internalInstruction || '';
            const userContent = parsed.userContent || '';
            content = instruction + (userContent ? `\n\n${userContent}` : '');
          }
        }
      } catch {
      }
      
      return { role: msg.role, content };
    }) as RAGMessage[];

    let usedRAG = false;
    const chatId = chatManager.getCurrentChatId();

    if (!skipRag) {
      try {
        const ragEnabled = await RAGService.isEnabled();
        if (ragEnabled) {
          if (!RAGService.isReady()) {
            await RAGService.initialize('apple-foundation');
          }
          if (RAGService.isReady()) {
            await RAGService.generate({
              input: baseMessages,
              settings,
              callback: streamCallback,
              scope: {
                chatId,
                provider: 'apple-foundation',
              },
            });
            usedRAG = true;
          }
        }
      } catch (error) {
        console.log('apple_rag_error', error instanceof Error ? error.message : 'unknown');
        usedRAG = false;
      }
    }

    if (!usedRAG) {
      try {
        const stream = appleFoundationService.streamResponse(
          baseMessages.map(msg => ({ role: msg.role, content: msg.content })),
          {
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
            topP: settings.topP,
            topK: settings.topK,
          }
        );

        for await (const chunk of stream) {
          if (this.cancelGenerationRef.current) {
            appleFoundationService.cancel();
            break;
          }

          if (firstTokenTime === null && chunk.trim().length > 0) {
            firstTokenTime = Date.now() - startTime;
          }

          fullResponse += chunk;
          const wordCount = fullResponse.trim().split(/\s+/).filter(word => word.length > 0).length;
          tokenCount = Math.max(1, Math.ceil(wordCount * 1.33));

          const duration = (Date.now() - startTime) / 1000;
          let avgTokenTime = undefined;

          if (firstTokenTime !== null && tokenCount > 0) {
            const timeAfterFirstToken = Date.now() - (startTime + firstTokenTime);
            avgTokenTime = timeAfterFirstToken / tokenCount;
          }

          this.callbacks.setStreamingMessage(fullResponse);
          this.callbacks.setStreamingStats({
            tokens: tokenCount,
            duration,
            firstTokenTime: firstTokenTime || undefined,
            avgTokenTime: avgTokenTime && avgTokenTime > 0 ? avgTokenTime : undefined,
          });

          updateCounter++;
          if (
            updateCounter % 10 === 0 ||
            fullResponse.endsWith('.') ||
            fullResponse.endsWith('!') ||
            fullResponse.endsWith('?')
          ) {
            let debouncedAvgTokenTime = undefined;
            if (firstTokenTime !== null && tokenCount > 0) {
              const timeAfterFirstToken = Date.now() - (startTime + firstTokenTime);
              debouncedAvgTokenTime = timeAfterFirstToken / tokenCount;
            }

            this.callbacks.updateMessageContentDebounced(
              messageId,
              fullResponse,
              '',
              {
                duration,
                tokens: tokenCount,
                firstTokenTime: firstTokenTime || undefined,
                avgTokenTime: debouncedAvgTokenTime && debouncedAvgTokenTime > 0 ? debouncedAvgTokenTime : undefined,
              }
            );
          }
        }
      } catch (error) {
        appleFoundationService.cancel();
        const message = error instanceof Error ? error.message : String(error);
        console.log('apple_intelligence_error', message);
        const normalized = message.toLowerCase();
        let displayMessage = 'Apple Intelligence not available on this device.';
        if (normalized.includes('disabled')) {
          displayMessage = 'Apple Intelligence is disabled. Enable it in Settings to continue.';
        } else if (normalized.includes('locale') || normalized.includes('language')) {
          displayMessage = 'Apple Intelligence language/locale not supported. Try using English locale.';
        } else if (!normalized.includes('not available')) {
          displayMessage = `Apple Intelligence error: ${message}`;
        }
        await chatManager.updateMessageContent(
          messageId,
          displayMessage,
          '',
          { duration: 0, tokens: 0 }
        );
        return;
      }
    }

    if (!this.cancelGenerationRef.current) {
      let finalAvgTokenTime = undefined;
      if (firstTokenTime !== null && tokenCount > 0) {
        const timeAfterFirstToken = Date.now() - (startTime + firstTokenTime);
        finalAvgTokenTime = timeAfterFirstToken / tokenCount;
      }

      await chatManager.updateMessageContent(
        messageId,
        fullResponse,
        '',
        {
          duration: (Date.now() - startTime) / 1000,
          tokens: tokenCount,
          firstTokenTime: firstTokenTime || undefined,
          avgTokenTime: finalAvgTokenTime && finalAvgTokenTime > 0 ? finalAvgTokenTime : undefined,
        }
      );
    }
  }

  private async processLocalModel(
    processedMessages: any[],
    settings: any,
    messageId: string,
    startTime: number,
    _tokenCount: number,
    _fullResponse: string,
    _thinking: string,
    _isThinking: boolean,
    _firstTokenTime: number | null,
    _updateCounter: number,
    skipRag: boolean
  ): Promise<void> {
    let tokenCount = 0;
    let fullResponse = '';
    let thinking = '';
    let isThinking = false;
    let firstTokenTime: number | null = null;
    let updateCounter = 0;

    const streamCallback = (token: string) => {
      if (this.cancelGenerationRef.current) {
        return false;
      }

      if (firstTokenTime === null && !isThinking && token.trim().length > 0 && !token.includes('<think>') && !token.includes('</think>')) {
        firstTokenTime = Date.now() - startTime;
      }

      if (token.includes('<think>')) {
        isThinking = true;
        return true;
      }
      if (token.includes('</think>')) {
        isThinking = false;
        return true;
      }

      tokenCount++;
      if (isThinking) {
        thinking += token;
        this.callbacks.setStreamingThinking(thinking.trim());
      } else {
        fullResponse += token;
        this.callbacks.setStreamingMessage(fullResponse);
      }

      const duration = (Date.now() - startTime) / 1000;
      let avgTokenTime = undefined;

      if (firstTokenTime !== null && tokenCount > 0) {
        const timeAfterFirstToken = Date.now() - (startTime + firstTokenTime);
        avgTokenTime = timeAfterFirstToken / tokenCount;
      }

      this.callbacks.setStreamingStats({
        tokens: tokenCount,
        duration: duration,
        firstTokenTime: firstTokenTime || undefined,
        avgTokenTime: avgTokenTime && avgTokenTime > 0 ? avgTokenTime : undefined
      });

      updateCounter++;
      if (updateCounter % 20 === 0) {
        let debouncedAvgTokenTime = undefined;
        if (firstTokenTime !== null && tokenCount > 0) {
          const timeAfterFirstToken = Date.now() - (startTime + firstTokenTime);
          debouncedAvgTokenTime = timeAfterFirstToken / tokenCount;
        }

        this.callbacks.updateMessageContentDebounced(
          messageId,
          fullResponse,
          thinking.trim(),
          {
            duration: (Date.now() - startTime) / 1000,
            tokens: tokenCount,
            firstTokenTime: firstTokenTime || undefined,
            avgTokenTime: debouncedAvgTokenTime && debouncedAvgTokenTime > 0 ? debouncedAvgTokenTime : undefined
          }
        );
      }

      return !this.cancelGenerationRef.current;
    };

  const baseMessages = processedMessages.map(msg => {
      let content = msg.content;
      
      try {
        const parsed = JSON.parse(msg.content);
        
        if (parsed && parsed.type === 'ocr_result') {
          if (parsed.metadata?.ragDocumentId) {
            const fileName = parsed.fileName ? ` from ${parsed.fileName}` : '';
            const userPrompt = parsed.userPrompt || 'Please process this extracted text';
            content = `User uploaded an image${fileName} and extracted text from it. The text has been stored for retrieval.\n\nUser request: ${userPrompt}`;
          } else {
            const instruction = parsed.internalInstruction || '';
            const userPrompt = parsed.userPrompt || '';
            content = instruction + (userPrompt ? `\n\n${userPrompt}` : '');
          }
        } else if (parsed && parsed.type === 'file_upload') {
          if (parsed.metadata?.ragDocumentId) {
            const fileName = parsed.fileName || 'a file';
            const userContent = parsed.userContent || `File uploaded: ${fileName}`;
            content = `User uploaded ${fileName}. The content has been stored for retrieval.\n\nUser request: ${userContent}`;
          } else {
            const instruction = parsed.internalInstruction || '';
            const userContent = parsed.userContent || '';
            content = instruction + (userContent ? `\n\n${userContent}` : '');
          }
        }
      } catch {
      }
      
      return { role: msg.role, content };
    }) as RAGMessage[];
    let usedRAG = false;
    const chatId = chatManager.getCurrentChatId();

    if (!skipRag) {
      try {
        const ragEnabled = await RAGService.isEnabled();
        if (ragEnabled && engineService.mgr().ready()) {
          if (!RAGService.isReady()) {
            await RAGService.initialize('local');
          }
          if (RAGService.isReady()) {
            await RAGService.generate({
              input: baseMessages,
              settings,
              callback: streamCallback,
              scope: {
                chatId,
                provider: 'local',
              },
            });
            usedRAG = true;
          }
        }
      } catch {
        usedRAG = false;
      }
    }

    if (!usedRAG) {
      await engineService.mgr().gen(
        baseMessages as any,
        {
          onToken: streamCallback,
          settings
        }
      );
    }

    if (!this.cancelGenerationRef.current) {
      let finalAvgTokenTime = undefined;
      if (firstTokenTime !== null && tokenCount > 0) {
        const timeAfterFirstToken = Date.now() - (startTime + firstTokenTime);
        finalAvgTokenTime = timeAfterFirstToken / tokenCount;
      }
      
      await chatManager.updateMessageContent(
        messageId,
        fullResponse,
        thinking.trim(),
        {
          duration: (Date.now() - startTime) / 1000,
          tokens: tokenCount,
          firstTokenTime: firstTokenTime || undefined,
          avgTokenTime: finalAvgTokenTime && finalAvgTokenTime > 0 ? finalAvgTokenTime : undefined
        }
      );
    }
  }

  private getProviderDisplayName(provider: string): 'Gemini' | 'OpenAI' | 'Claude' {
    const base = OnlineModelService.getBaseProvider(provider);
    switch (base) {
      case 'gemini': return 'Gemini';
      case 'chatgpt': return 'OpenAI';
      case 'claude': return 'Claude';
      default: return 'OpenAI';
    }
  }

  private async resolveResponderModelName(activeProvider: ProviderType | null): Promise<string | undefined> {
    if (!activeProvider || activeProvider === 'local') {
      const activePath = engineService.getActiveModelPath();
      if (!activePath) {
        return undefined;
      }
      return this.getLocalModelName(activePath);
    }

    if (activeProvider === 'apple-foundation') {
      return 'Apple Foundation';
    }

    const configured = await onlineModelService.getModelName(activeProvider);
    if (configured && configured.trim()) {
      return configured.trim();
    }

    const fallback = onlineModelService.getDefaultModelName(activeProvider);
    if (fallback && fallback.trim()) {
      return fallback.trim();
    }

    const base = OnlineModelService.getBaseProvider(activeProvider);
    return base || undefined;
  }

  private getLocalModelName(path: string): string {
    const file = path.split('/').pop() || path;
    return file.replace(/\.(gguf|mlx)$/i, '');
  }

  private shouldSkipRag(messages: Array<{ role: string; content: string }>): boolean {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const entry = messages[index];
      if (entry.role !== 'user') {
        continue;
      }
      try {
        const parsed = JSON.parse(entry.content);
        if (parsed?.type === 'multimodal') {
          return true;
        }
        return parsed?.metadata?.ragDisabled === true;
      } catch {
        return false;
      }
    }
    return false;
  }

  private async shouldSkipRagForInput(messages: Array<{ role: string; content: string }>): Promise<boolean> {
    let lastUserText = '';

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const entry = messages[index];
      if (entry.role !== 'user') {
        continue;
      }

      try {
        const parsed = JSON.parse(entry.content);
        if (parsed?.type === 'ocr_result') {
          lastUserText = String(parsed?.userPrompt || '').trim();
        } else if (parsed?.type === 'file_upload') {
          lastUserText = String(parsed?.userContent || '').trim();
        } else {
          lastUserText = String(entry.content || '').trim();
        }
      } catch {
        lastUserText = String(entry.content || '').trim();
      }
      break;
    }

    const compactText = lastUserText.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const tokenCount = compactText.length > 0 ? compactText.split(/\s+/).length : 0;

    if (compactText.length <= 4 || tokenCount <= 1) {
      return true;
    }

    if (/^(hi|hey|hello|yo|sup|hola|hii+)$/.test(compactText)) {
      return true;
    }

    try {
      const status = await RAGService.getStatus();
      if (!status.enabled || status.documentCount <= 0) {
        return true;
      }
    } catch {
      return true;
    }

    return false;
  }
}
