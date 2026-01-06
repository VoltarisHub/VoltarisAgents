import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import { getThemeAwareColor, getDocumentIconColor } from '../../utils/ColorUtils';
import StoredModelItem from './StoredModelItem';
import { StoredModel } from '../../services/ModelDownloaderTypes';

const formatBytes = (bytes?: number) => {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes === 0) return '0 B';
  try {
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if (i < 0 || i >= sizes.length || !isFinite(bytes)) return '0 B';
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  } catch (error) {
    return '0 B';
  }
};

interface StoredModelsTabProps {
  storedModels: StoredModel[];
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onImportModel: () => void;
  onDelete: (model: StoredModel) => void;
  onExport: (modelPath: string, modelName: string) => Promise<void>;
  onSettings: (modelPath: string, modelName: string) => void;
}

export const StoredModelsTab: React.FC<StoredModelsTabProps> = ({
  storedModels,
  isLoading,
  isRefreshing,
  onRefresh,
  onImportModel,
  onDelete,
  onExport,
  onSettings
}) => {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme as 'light' | 'dark'];
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  const groupMLXModels = (models: StoredModel[]): StoredModel[] => {
    const mlxGroups: { [key: string]: StoredModel[] } = {};
    const otherModels: StoredModel[] = [];

    models.forEach(model => {
      const nameParts = model.name.split('_');
      if (nameParts.length >= 2 && (nameParts[0].includes('/') || model.name.toLowerCase().includes('mlx'))) {
        const baseModelName = nameParts.slice(0, 2).join('_');
        if (!mlxGroups[baseModelName]) {
          mlxGroups[baseModelName] = [];
        }
        mlxGroups[baseModelName].push(model);
      } else {
        otherModels.push(model);
      }
    });

    const groupedMLXModels: any[] = [];

    Object.entries(mlxGroups).forEach(([baseName, files]) => {
      if (files.length === 1) {
        groupedMLXModels.push(files[0]);
        return;
      }

      const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
      const firstFile = files[0];
      const modelName = baseName.replace(/_/g, '/');

      const groupItem = {
        ...firstFile,
        name: modelName,
        size: totalSize,
        path: firstFile.path,
        isMLXGroup: true,
        mlxFiles: files,
        groupKey: baseName,
      };

      groupedMLXModels.push(groupItem);
    });

    return [...groupedMLXModels, ...otherModels];
  };

  const displayModels = groupMLXModels(storedModels);

  const StoredModelsHeader = () => (
    <View style={styles.storedModelsHeader}>
      <View style={styles.storedHeaderActions}>
        <Text style={[styles.storedHeaderTitle, { color: themeColors.text }]}>Stored Models</Text>
        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: themeColors.borderColor }]}
          onPress={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={getThemeAwareColor('#4a0660', currentTheme)} />
          ) : (
            <MaterialCommunityIcons name="refresh" size={20} color={themeColors.text} />
          )}
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.customUrlButton, { backgroundColor: themeColors.borderColor }]}
        onPress={onImportModel}
      >
        <View style={styles.customUrlButtonContent}>
          <View style={styles.customUrlIconContainer}>
            <MaterialCommunityIcons name="link" size={24} color={getThemeAwareColor('#4a0660', currentTheme)} />
          </View>
          <View style={styles.customUrlTextContainer}>
            <Text style={[styles.customUrlButtonTitle, { color: themeColors.text }]}>
              Import Model
            </Text>
            <Text style={[styles.customUrlButtonSubtitle, { color: themeColors.secondaryText }]}>
              Import a GGUF model from the storage
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    const isProjectorModel = item.name.toLowerCase().includes('mmproj') ||
                            item.name.toLowerCase().includes('.proj');
    const isGGUFModel = item.name.toLowerCase().includes('.gguf');
    
    if (item.isMLXGroup) {
      const isExpanded = expandedGroups.has(item.groupKey);
      return (
        <View style={[styles.groupContainer, { backgroundColor: themeColors.borderColor }]}>
          <TouchableOpacity
            style={styles.groupHeader}
            onPress={() => toggleGroup(item.groupKey)}
            activeOpacity={0.7}
          >
            <View style={styles.modelIconContainer}>
              <MaterialCommunityIcons
                name="file-document-outline"
                size={24}
                color={getDocumentIconColor(currentTheme)}
              />
            </View>
            <View style={styles.groupInfo}>
              <View style={styles.groupTitleRow}>
                <Text style={[styles.groupName, { color: themeColors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
              <View style={styles.groupMetadata}>
                <MaterialCommunityIcons name="download" size={14} color={themeColors.secondaryText} />
                <Text style={[styles.metaText, { color: themeColors.secondaryText }]}>
                  {formatBytes(item.size)}
                </Text>
                <View style={[styles.mlxBadge, { backgroundColor: getThemeAwareColor('#4a0660', currentTheme) }]}>
                  <MaterialCommunityIcons name="apple" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.mlxBadgeText}>MLX</Text>
                </View>
              </View>
            </View>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete(item);
                }}
              >
                <MaterialCommunityIcons name="delete-outline" size={20} color={getThemeAwareColor('#ff4444', currentTheme)} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <MaterialCommunityIcons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={themeColors.text}
                />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
          {isExpanded && (
            <View style={[styles.expandedContent, { borderTopColor: themeColors.background }]}>
              {item.mlxFiles.map((file: StoredModel, index: number) => (
                <View key={file.path} style={styles.fileRow}>
                  <View style={styles.fileRowContent}>
                    <MaterialCommunityIcons
                      name="file-document-outline"
                      size={16}
                      color={themeColors.secondaryText}
                      style={styles.fileIcon}
                    />
                    <Text style={[styles.fileName, { color: themeColors.text }]} numberOfLines={1}>
                      {file.name.split('_').slice(2).join('_')}
                    </Text>
                  </View>
                  <Text style={[styles.fileSize, { color: themeColors.secondaryText }]}>
                    {formatBytes(file.size)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      );
    }
    
    return (
      <StoredModelItem
        id={item.path}
        name={item.name}
        path={item.path}
        size={item.size}
        isProjector={isProjectorModel}
        isMLXGroup={false}
        onDelete={() => onDelete(item)}
        onExport={onExport}
        onSettings={onSettings}
      />
    );
  };

  return (
    <FlatList
      data={displayModels}
      renderItem={renderItem}
      keyExtractor={(item: any) => item.isMLXGroup ? `group-${item.groupKey}` : item.path}
      contentContainerStyle={styles.list}
      ListHeaderComponent={StoredModelsHeader}
      ListEmptyComponent={
        isLoading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={getThemeAwareColor('#4a0660', currentTheme)} />
            <Text style={[styles.emptyText, { color: themeColors.secondaryText, marginTop: 16 }]}>
              Loading models...
            </Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons 
              name="folder-open" 
              size={48} 
              color={themeColors.secondaryText}
            />
            <Text style={[styles.emptyText, { color: themeColors.secondaryText }]}>
              No models downloaded yet. Go to the "Download Models" tab to get started.
            </Text>
          </View>
        )
      }
    />
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingTop: 8,
  },
  storedModelsHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  storedHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  storedHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customUrlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  customUrlButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customUrlIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 6, 96, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  customUrlTextContainer: {
    flex: 1,
  },
  customUrlButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  customUrlButtonSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 8,
  },
  groupContainer: {
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  modelIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 6, 96, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
    gap: 4,
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  groupName: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  mlxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  mlxBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  groupMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 13,
    marginLeft: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  expandedContent: {
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  fileRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  fileIcon: {
    marginRight: 10,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  fileSize: {
    fontSize: 13,
    fontWeight: '500',
  },
});
