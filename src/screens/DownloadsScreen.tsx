import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { fs as FileSystem } from '../services/fs';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { modelDownloader } from '../services/ModelDownloader';
import { useDownloads } from '../context/DownloadContext';
import AppHeader from '../components/AppHeader';
import { getThemeAwareColor } from '../utils/ColorUtils';
import { Text, Button } from 'react-native-paper';
import Dialog, { Portal } from '../components/Dialog';

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, index)).toFixed(2)} ${sizes[index]}`;
};

const listFilesDeep = async (rootDir: string, currentDir: string = rootDir): Promise<string[]> => {
  const entries = await FileSystem.readDirectoryAsync(currentDir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = `${currentDir}/${entry}`;
    const info = await FileSystem.getInfoAsync(fullPath);

    if (!info.exists) {
      continue;
    }

    if (info.isDirectory) {
      const nested = await listFilesDeep(rootDir, fullPath);
      files.push(...nested);
    } else {
      const relative = fullPath.replace(`${rootDir}/`, '');
      files.push(relative);
    }
  }

  return files;
};

interface DownloadItem {
  id: number;
  name: string;
  progress: number;
  bytesDownloaded: number;
  totalBytes: number;
  status: string;
}

export default function DownloadsScreen() {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme as 'light' | 'dark'];
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { downloadProgress, setDownloadProgress } = useDownloads();
  const buttonProcessingRef = useRef<Set<string>>(new Set());

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogActions, setDialogActions] = useState<React.ReactNode[]>([]);
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [cancelModelName, setCancelModelName] = useState('');
  const [mlxPackageFiles, setMlxPackageFiles] = useState<Record<string, string[]>>({});
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set());

  const hideDialog = () => setDialogVisible(false);

  const hideCancelDialog = () => {
    setCancelDialogVisible(false);
    setCancelModelName('');
  };

  const showDialog = (title: string, message: string, actions: React.ReactNode[]) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogActions(actions);
    setDialogVisible(true);
  };

  const activeDownloads = Object.entries(downloadProgress).filter(([_, data]) => {
    return data.status !== 'completed' &&
           data.status !== 'failed' &&
           data.status !== 'cancelled' &&
           data.progress < 100;
  });

  const downloads: DownloadItem[] = activeDownloads.map(([name, data]) => ({
    id: data.downloadId || 0,
    name,
    progress: data.progress || 0,
    bytesDownloaded: data.bytesDownloaded || 0,
    totalBytes: data.totalBytes || 0,
    status: data.status || 'unknown'
  }));

  useEffect(() => {
    modelDownloader.ensureDownloadsAreRunning().catch(() => {
    });
  }, []);

  useEffect(() => {
    const loadMlxPackageFiles = async () => {
      try {
        const activeList = await modelDownloader.getActiveDownloadsList();
        const grouped: Record<string, Set<string>> = {};

        for (const item of activeList) {
          const match = item.modelName.match(/^temp_mlx_(.+)_\d+_(.+)$/);
          if (!match) {
            continue;
          }

          const packageName = match[1];
          const fileName = match[2];

          if (!grouped[packageName]) {
            grouped[packageName] = new Set<string>();
          }

          grouped[packageName].add(fileName);
        }

        const activePackageNames = Object.entries(downloadProgress)
          .filter(([, data]) => data.status !== 'completed' && data.status !== 'failed' && data.status !== 'cancelled')
          .map(([name]) => name);

        for (const packageName of activePackageNames) {
          try {
            const manifestFiles = await modelDownloader.getMLXPackageManifest(packageName);
            if (!grouped[packageName]) {
              grouped[packageName] = new Set<string>();
            }
            for (const file of manifestFiles) {
              grouped[packageName].add(file);
            }
          } catch {
          }

          const packageDir = `${FileSystem.documentDirectory}models/mlx/${packageName}`;
          try {
            const dirInfo = await FileSystem.getInfoAsync(packageDir);
            if (dirInfo.exists && dirInfo.isDirectory) {
              const files = await listFilesDeep(packageDir);
              if (!grouped[packageName]) {
                grouped[packageName] = new Set<string>();
              }
              for (const file of files) {
                grouped[packageName].add(file);
              }
            }
          } catch {
          }
        }

        const normalized: Record<string, string[]> = {};
        Object.entries(grouped).forEach(([packageName, files]) => {
          normalized[packageName] = Array.from(files).sort((a, b) => a.localeCompare(b));
        });

        setMlxPackageFiles(normalized);
      } catch {
      }
    };

    loadMlxPackageFiles();
  }, [downloadProgress]);

  const togglePackage = (packageName: string) => {
    setExpandedPackages(prev => {
      const next = new Set(prev);
      if (next.has(packageName)) {
        next.delete(packageName);
      } else {
        next.add(packageName);
      }
      return next;
    });
  };



  const handleCancel = (modelName: string) => {
    setCancelModelName(modelName);
    setCancelDialogVisible(true);
  };

  const confirmCancellation = async () => {
    const modelName = cancelModelName;
    hideCancelDialog();

    if (!modelName || buttonProcessingRef.current.has(modelName)) {
      return;
    }

    buttonProcessingRef.current.add(modelName);

    try {
      await modelDownloader.cancelDownload(modelName);
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[modelName];
        return newProgress;
      });
    } catch {
      showDialog('Error', 'Failed to cancel download', [
        <Button key="ok" onPress={hideDialog}>OK</Button>
      ]);
    } finally {
      buttonProcessingRef.current.delete(modelName);
    }
  };

  const handleCancelAll = () => {
    const activeNames = downloads.map(item => item.name);
    if (activeNames.length === 0) {
      return;
    }

    const confirmCancelAll = async () => {
      hideDialog();

      try {
        await Promise.allSettled(
          activeNames.map(async modelName => {
            if (buttonProcessingRef.current.has(modelName)) {
              return;
            }
            buttonProcessingRef.current.add(modelName);
            try {
              await modelDownloader.cancelDownload(modelName);
            } finally {
              buttonProcessingRef.current.delete(modelName);
            }
          })
        );

        setDownloadProgress(prev => {
          const next = { ...prev };
          for (const modelName of activeNames) {
            delete next[modelName];
          }
          return next;
        });
      } catch {
        showDialog('Error', 'Failed to cancel all downloads', [
          <Button key="ok" onPress={hideDialog}>OK</Button>
        ]);
      }
    };

    showDialog(
      'Cancel All Downloads',
      `Are you sure you want to cancel ${activeNames.length} active downloads?`,
      [
        <Button key="cancel" onPress={hideDialog}>No</Button>,
        <Button key="confirm" onPress={confirmCancelAll}>Yes</Button>
      ]
    );
  };

  const headerRightButtons = downloads.length > 0 ? (
    <TouchableOpacity
      style={styles.headerButton}
      onPress={handleCancelAll}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <MaterialCommunityIcons
        name="close-circle-outline"
        size={22}
        color={themeColors.headerText}
      />
    </TouchableOpacity>
  ) : [];

  const renderItem = ({ item }: { item: DownloadItem }) => {
    const packageFiles = mlxPackageFiles[item.name] || [];
    const isMLXDownload = packageFiles.length > 0;
    const isExpanded = expandedPackages.has(item.name);
    const progressText = `${Math.floor(item.progress || 0)}% • ${formatBytes(item.bytesDownloaded || 0)} / ${formatBytes(item.totalBytes || 0)}`;
    
    return (
      <View style={[styles.downloadItem, { backgroundColor: themeColors.borderColor }]}>
        <View style={styles.downloadHeader}>
          <View style={styles.downloadTitleContainer}>
            <Text style={[styles.downloadName, { color: themeColors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {isMLXDownload && (
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => togglePackage(item.name)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={themeColors.secondaryText}
                />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.downloadActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancel(item.name)}
            >
              <MaterialCommunityIcons name="close-circle" size={24} color={getThemeAwareColor('#ff4444', currentTheme)} />
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={[styles.downloadProgress, { color: themeColors.secondaryText }]}>
          {progressText}
        </Text>

        {isMLXDownload && isExpanded && (
          <View style={styles.packageFilesContainer}>
            {packageFiles.map(fileName => (
              <Text key={`${item.name}-${fileName}`} style={[styles.packageFileText, { color: themeColors.secondaryText }]} numberOfLines={1}>
                • {fileName}
              </Text>
            ))}
          </View>
        )}
        
        <View style={[styles.progressBar, { backgroundColor: themeColors.background }]}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${item.progress}%`, backgroundColor: getThemeAwareColor('#4a0660', currentTheme) }
            ]} 
          />
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <AppHeader
        title="Active Downloads"
        showBackButton
        showLogo={false}
        rightButtons={headerRightButtons}
      />
      
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <FlatList
          data={downloads}
          renderItem={renderItem}
          keyExtractor={item => `download-${item.name}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: themeColors.secondaryText }]}>
                No active downloads
              </Text>
            </View>
          )}
        />
      </View>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={hideDialog}>
          <Dialog.Title>{dialogTitle}</Dialog.Title>
          <Dialog.Content>
            <Text>{dialogMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            {dialogActions}
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Dialog
        visible={cancelDialogVisible}
        onClose={hideCancelDialog}
        title="Cancel Download"
        description="Are you sure you want to cancel this download?"
        iconName="close-circle-outline"
        primaryButtonText="Yes"
        onPrimaryPress={confirmCancellation}
        secondaryButtonText="No"
        onSecondaryPress={hideCancelDialog}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  downloadItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  downloadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  downloadTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  downloadName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    flex: 1,
  },
  expandButton: {
    padding: 2,
    marginLeft: 6,
  },
  downloadActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  downloadProgress: {
    fontSize: 14,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  packageFilesContainer: {
    marginBottom: 8,
    paddingVertical: 4,
  },
  packageFileText: {
    fontSize: 12,
    marginBottom: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 32,
  },
  emptyText: {
    fontSize: 16,
  },
  cancelButton: {
    padding: 4,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 
