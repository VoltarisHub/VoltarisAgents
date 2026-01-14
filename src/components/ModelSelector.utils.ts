import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ProviderType } from '../services/ModelManagementService';
import { StoredModel, MLXGroup } from './ModelSelector.types';

export const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B ', 'KB ', 'MB ', 'GB '];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

export const getDisplayName = (filename: string) => {
  return filename.split('.')[0];
};

export const getModelNameFromPath = (path: string | null, models: StoredModel[]): string => {
  if (!path) return 'Select a Model';
  
  if (path === 'gemini') return 'Gemini';
  if (path === 'chatgpt') return 'ChatGPT';
  if (path === 'deepseek') return 'DeepSeek';
  if (path === 'claude') return 'Claude';
  if (path === 'apple-foundation') return 'Apple Foundation';
  
  const model = models.find(m => m.path === path);
  return model ? getDisplayName(model.name) : getDisplayName(path.split('/').pop() || '');
};

export const getProjectorNameFromPath = (path: string | null, models: StoredModel[]): string => {
  if (!path) return '';
  
  const model = models.find(m => m.path === path);
  return model ? getDisplayName(model.name) : getDisplayName(path.split('/').pop() || '');
};

const remoteProviders = new Set<ProviderType>(['gemini', 'chatgpt', 'deepseek', 'claude']);

const isRemoteProvider = (provider: string | null): boolean => {
  if (!provider) return false;
  return remoteProviders.has(provider as ProviderType);
};

const isAppleProvider = (provider: string | null): boolean => provider === 'apple-foundation';

export const getActiveModelIcon = (provider: string | null): keyof typeof MaterialCommunityIcons.glyphMap => {
  if (!provider) return 'cube-outline';
  if (isAppleProvider(provider)) return 'apple';
  if (isRemoteProvider(provider)) return 'cloud';
  return 'cube';
};

export const getConnectionBadgeConfig = (provider: string | null, currentTheme: 'light' | 'dark') => {
  if (isRemoteProvider(provider)) {
    return {
      backgroundColor: 'rgba(74, 180, 96, 0.15)',
      textColor: '#2a8c42',
      label: 'REMOTE'
    };
  }
  if (isAppleProvider(provider)) {
    return {
      backgroundColor: 'rgba(74, 6, 96, 0.1)',
      textColor: currentTheme === 'dark' ? '#fff' : '#660880',
      label: 'APPLE'
    };
  }
  return {
    backgroundColor: 'rgba(74, 6, 96, 0.1)',
    textColor: currentTheme === 'dark' ? '#fff' : '#660880',
    label: 'LOCAL'
  };
};

export const isMLXModel = (model: StoredModel): boolean => {
  const path = model.path.toLowerCase();
  const name = model.name.toLowerCase();
  return path.includes('/models/mlx/') || 
         name.endsWith('.safetensors') ||
         path.endsWith('.safetensors') ||
         name.endsWith('.json') ||
         path.endsWith('.json') ||
         name.includes('mlx-community') ||
         path.includes('mlx-community') ||
         name.includes('mlx_') ||
         path.includes('/mlx/');
};

export const groupMLXModels = (items: StoredModel[]): (StoredModel | MLXGroup)[] => {
  const groups: { [key: string]: StoredModel[] } = {};
  const others: StoredModel[] = [];

  items.forEach(model => {
    const dirPath = model.path.substring(0, model.path.lastIndexOf('/'));
    const dirName = dirPath.split('/').pop() || '';

    if (dirName) {
      if (!groups[dirPath]) {
        groups[dirPath] = [];
      }
      groups[dirPath].push(model);
    } else {
      others.push(model);
    }
  });

  const grouped: (StoredModel | MLXGroup)[] = [];

  Object.entries(groups).forEach(([dirPath, files]) => {
    if (files.length === 1) {
      grouped.push(files[0]);
      return;
    }

    const size = files.reduce((sum, file) => sum + (file.size || 0), 0);
    const first = files[0];
    const dirName = dirPath.split('/').pop() || '';
    
    const commonPrefix = files[0].name.split('_').slice(0, -1).join('_');
    const displayName = commonPrefix || dirName;
    const modelId = commonPrefix.replace(/_/g, '/');

    console.log('mlx_group_created', {
      dirPath,
      dirName,
      firstFilePath: first.path,
      filesCount: files.length,
      fileNames: files.map(f => f.name),
      commonPrefix,
      modelId
    });

    grouped.push({
      ...first,
      name: displayName,
      size,
      path: modelId,
      isMLXGroup: true,
      mlxFiles: files,
      groupKey: dirPath,
    });
  });

  return [...grouped, ...others];
};
