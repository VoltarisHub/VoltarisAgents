import { LLM } from 'react-native-nitro-mlx';
import { EngineCaps, GenOpts, InferenceManager, Msg } from './inference-manager';
import { fs as FileSystem } from '../services/fs';

const caps: EngineCaps = {
  embeddings: false,
  vision: false,
  audio: false,
  rag: false,
  grammar: false,
  jinja: false,
  dry: false,
  mirostat: false,
  xtc: false,
};

type State = {
  loaded: boolean,
  modelId: string,
};

class MlxManager implements InferenceManager {
  private state: State = { loaded: false, modelId: '' };

  private getLastSegment(value: string): string {
    const cleaned = value.replace(/^file:\/\//, '').replace(/\/+$/, '');
    const parts = cleaned.split('/').filter(Boolean);
    return parts[parts.length - 1] || value;
  }

  private resolveModelId(modelIdOrPath: string): string {
    const raw = modelIdOrPath.trim();
    if (!raw) {
      return raw;
    }

    const cleaned = raw.replace(/^file:\/\//, '');
    if (cleaned.includes('/models/mlx/') || cleaned.includes('/huggingface/models/')) {
      return this.getLastSegment(cleaned);
    }

    return raw;
  }

  private getMlxDir(modelId: string): string {
    const docsDir = FileSystem.documentDirectory || '';
    return `${docsDir}models/mlx/${modelId}`;
  }

  private getNitroDir(modelId: string): string {
    const docsDir = FileSystem.documentDirectory || '';
    return `${docsDir}huggingface/models/${modelId}`;
  }

  private getNitroBaseDir(): string {
    const docsDir = FileSystem.documentDirectory || '';
    return `${docsDir}huggingface/models`;
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      const info = await FileSystem.getInfoAsync(path);
      return !!info.exists;
    } catch {
      return false;
    }
  }

  private async moveDirContents(sourceDir: string, targetDir: string): Promise<void> {
    await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
    const entries = await FileSystem.readDirectoryAsync(sourceDir);

    for (const entry of entries) {
      const fromPath = `${sourceDir}/${entry}`;
      const toPath = `${targetDir}/${entry}`;
      const info = await FileSystem.getInfoAsync(fromPath);
      if (!info.exists) {
        continue;
      }
      if ((info as any).isDirectory) {
        await this.moveDirContents(fromPath, toPath);
        await FileSystem.deleteAsync(fromPath, { idempotent: true });
      } else {
        const targetInfo = await FileSystem.getInfoAsync(toPath);
        if (targetInfo.exists) {
          await FileSystem.deleteAsync(toPath, { idempotent: true });
        }
        await FileSystem.moveAsync({
          from: fromPath,
          to: toPath,
        });
      }
    }
  }

  private async migrateFilesIfNeeded(modelId: string): Promise<boolean> {
    try {
      const sourceDir = this.getMlxDir(modelId);
      const targetDir = this.getNitroDir(modelId);
      const nitroBaseDir = this.getNitroBaseDir();

      const sourceInfo = await FileSystem.getInfoAsync(sourceDir);
      if (!sourceInfo.exists || !(sourceInfo as any).isDirectory) {
        return false;
      }

      await FileSystem.makeDirectoryAsync(nitroBaseDir, { intermediates: true });

      const targetInfo = await FileSystem.getInfoAsync(targetDir);
      if (!targetInfo.exists) {
        await FileSystem.moveAsync({ from: sourceDir, to: targetDir });
      } else {
        await this.moveDirContents(sourceDir, targetDir);
        await FileSystem.deleteAsync(sourceDir, { idempotent: true });
      }

      console.log('mlx_migration_complete', { modelId, sourceDir, targetDir });
      return true;
    } catch (error) {
      console.log('mlx_migration_error', error);
      return false;
    }
  }

  private getCandidateModelIds(modelId: string): string[] {
    const set = new Set<string>();
    set.add(modelId);
    if (modelId.includes('_')) {
      set.add(modelId.replace(/_/g, '/'));
    }
    if (modelId.includes('/')) {
      set.add(modelId.replace(/\//g, '_'));
    }
    return Array.from(set).filter(Boolean);
  }

  async init(modelIdOrPath: string) {
    console.log('mlx_init_start', modelIdOrPath);

    const resolvedModelId = this.resolveModelId(modelIdOrPath);
    const candidateIds = this.getCandidateModelIds(resolvedModelId);
    console.log('mlx_candidate_ids', candidateIds);

    try {
      for (const candidateId of candidateIds) {
        console.log('mlx_attempting_migration', candidateId);
        await this.migrateFilesIfNeeded(candidateId);
      }

      let hasLocalPackage = false;
      for (const id of candidateIds) {
        const inNitroDir = await this.pathExists(this.getNitroDir(id));
        const inMlxDir = await this.pathExists(this.getMlxDir(id));
        if (inNitroDir || inMlxDir) {
          hasLocalPackage = true;
          break;
        }
      }

      if (!hasLocalPackage && (modelIdOrPath.includes('/models/mlx/') || modelIdOrPath.includes('/huggingface/models/'))) {
        throw new Error('mlx_model_not_downloaded');
      }

      let loadedId = '';
      let lastError: unknown;

      for (const candidateId of candidateIds) {
        try {
          await LLM.load(candidateId, {
            onProgress: (progress) => {
              console.log('mlx_loading_progress', progress);
            },
            manageHistory: true,
          });
          loadedId = candidateId;
          break;
        } catch (error) {
          lastError = error;
          console.log('mlx_load_attempt_failed', { candidateId, error });
        }
      }

      if (!loadedId) {
        throw (lastError instanceof Error ? lastError : new Error('mlx_model_not_downloaded'));
      }

      this.state = { loaded: true, modelId: loadedId };
      console.log('mlx_init_complete', loadedId);
    } catch (error) {
      console.log('mlx_init_error', error);
      throw error;
    }
  }

  async gen(messages: Msg[], opts?: GenOpts) {
    console.log('mlx_gen_start', { loaded: this.state.loaded, modelId: this.state.modelId, messageCount: messages.length });
    
    if (!this.state.loaded) {
      console.log('mlx_gen_error_not_ready');
      throw new Error('engine_not_ready');
    }
    
    const lastMessage = messages[messages.length - 1];
    const prompt = typeof lastMessage.content === 'string' ? lastMessage.content : '';
    console.log('mlx_gen_prompt', { promptLength: prompt.length, role: lastMessage.role });
    
    let full = '';
    let tokenCount = 0;
    await LLM.stream(prompt, token => {
      full += token;
      tokenCount++;
      console.log('mlx_token_received', { tokenCount, tokenLength: token.length });
      if (opts?.onToken) {
        const continueStreaming = opts.onToken(token);
        console.log('mlx_token_callback_result', { continueStreaming });
        if (continueStreaming === false) {
          console.log('mlx_stream_cancelled_by_callback');
        }
      }
    });
    
    console.log('mlx_gen_complete', { responseLength: full.length, tokenCount });
    return full.trim();
  }

  async embed(text: string) {
    return Promise.reject<number[]>(new Error('embeddings_not_supported'));
  }

  async release() {
    if (this.state.loaded) {
      try {
        console.log('mlx_unload_start');
        LLM.unload();
        this.state = { loaded: false, modelId: '' };
        console.log('mlx_unload_complete');
      } catch (error) {
        console.log('mlx_unload_error', error);
        this.state = { loaded: false, modelId: '' };
      }
    }
  }

  caps() {
    return caps;
  }

  ready() {
    console.log('mlx_ready_check', { loaded: this.state.loaded, modelId: this.state.modelId });
    return this.state.loaded;
  }
}

export const mlxManager = new MlxManager();
