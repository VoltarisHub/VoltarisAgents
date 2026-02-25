import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  SectionList,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { modelDownloader } from '../services/ModelDownloader';
import { ThemeColors } from '../types/theme';
import { useModel } from '../context/ModelContext';
import { useRemoteModel } from '../context/RemoteModelContext';
import { getThemeAwareColor } from '../utils/ColorUtils';
import { onlineModelService } from '../services/OnlineModelService';
import { engineService } from '../services/inference-engine-service';
import { Dialog, Portal, Text, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { appleFoundationService } from '../services/AppleFoundationService';
import type { ProviderType } from '../services/ModelManagementService';
import { useStoredModels } from '../hooks/useStoredModels';
import type { StoredModel, OnlineModel, AppleFoundationModel, MLXGroup, Model, ModelSelectorRef, ModelSelectorProps, SectionData } from './ModelSelector.types';
import { ONLINE_MODELS } from './ModelSelector.constants';
import { formatBytes, getDisplayName, getModelNameFromPath, getProjectorNameFromPath, isMLXModel, groupMLXModels, getActiveModelIcon, getConnectionBadgeConfig } from './ModelSelector.utils';
import { styles } from './ModelSelector.styles';
import { renderAppleFoundationItem, renderLocalModelItem, renderOnlineModelItem, renderSectionHeader, renderItem, type RenderContext } from './ModelSelector.renderers';

export type { ModelSelectorRef } from './ModelSelector.types';

const ModelSelector = forwardRef<{ refreshModels: () => void }, ModelSelectorProps>(
  ({ isOpen, onClose, preselectedModelPath, isGenerating, onModelSelect, navigation: propNavigation }, ref) => {
    const { theme: currentTheme } = useTheme();
    const themeColors = theme[currentTheme as ThemeColors];
    const { enableRemoteModels, isLoggedIn } = useRemoteModel();
    const defaultNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const navigation = propNavigation || defaultNavigation;
    const [modalVisible, setModalVisible] = useState(false);
    const { storedModels: models, isLoading: isLoadingLocalModels, isRefreshing: isRefreshingLocalModels, refreshStoredModels } = useStoredModels();
    const { selectedModelPath, selectedProjectorPath, isModelLoading, loadModel, unloadModel, unloadProjector, isMultimodalEnabled } = useModel();
    const [onlineModelStatuses, setOnlineModelStatuses] = useState<{[key: string]: boolean}>({
      gemini: false,
      chatgpt: false,
      deepseek: false,
      claude: false
    });
    const [isOnlineModelsExpanded, setIsOnlineModelsExpanded] = useState(false);
    const [isLocalModelsExpanded, setIsLocalModelsExpanded] = useState(true);

    const [dialogVisible, setDialogVisible] = useState(false);
    const [dialogTitle, setDialogTitle] = useState('');
    const [dialogMessage, setDialogMessage] = useState('');
    const [dialogActions, setDialogActions] = useState<React.ReactNode[]>([]);

    const [projectorSelectorVisible, setProjectorSelectorVisible] = useState(false);
    const [projectorModels, setProjectorModels] = useState<StoredModel[]>([]);
    const [selectedVisionModel, setSelectedVisionModel] = useState<Model | null>(null);
  const [appleFoundationEnabled, setAppleFoundationEnabled] = useState(false);
  const [appleFoundationAvailable, setAppleFoundationAvailable] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const hideDialog = () => setDialogVisible(false);

    const showDialog = (title: string, message: string, actions: React.ReactNode[]) => {
      setDialogTitle(title);
      setDialogMessage(message);
      setDialogActions(actions);
      setDialogVisible(true);
    };

    const hasAnyApiKey = () => {
      return Object.values(onlineModelStatuses).some(status => status);
    };

    const toggleOnlineModelsDropdown = () => {
      setIsOnlineModelsExpanded(!isOnlineModelsExpanded);
    };

    const toggleGroup = (key: string) => {
      setExpandedGroups(prev => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    };

    const refreshAppleFoundationState = async () => {
      if (Platform.OS !== 'ios') {
        setAppleFoundationEnabled(false);
        setAppleFoundationAvailable(false);
        return;
      }
      try {
        const available = appleFoundationService.isAvailable();
        const enabled = await appleFoundationService.isEnabled();
        setAppleFoundationAvailable(available);
        setAppleFoundationEnabled(enabled);
      } catch (error) {
        setAppleFoundationAvailable(false);
        setAppleFoundationEnabled(false);
      }
    };

    const sections = useMemo(() => {
      const completedModels = models.filter(model => {
        const isProjectorModel = model.name.toLowerCase().includes('mmproj') ||
                                 model.name.toLowerCase().includes('.proj');
        return !isProjectorModel;
      });

      const sectionsData: SectionData[] = [];
      const localModels: Model[] = [];

      if (Platform.OS === 'ios' && appleFoundationEnabled && appleFoundationAvailable) {
        localModels.push({
          id: 'apple-foundation',
          name: 'Apple Foundation',
          provider: 'Apple Intelligence',
          isAppleFoundation: true,
        });
      }

      const mlxModels = completedModels.filter(isMLXModel);
      const ggufModels = completedModels.filter(model => !isMLXModel(model));
      const groupedMlx = groupMLXModels(mlxModels);

      localModels.push(...ggufModels, ...groupedMlx);

      if (localModels.length > 0) {
        sectionsData.push({ title: 'Local Models', data: localModels });
      }

      sectionsData.push({ title: 'Remote Models', data: ONLINE_MODELS });
      return sectionsData;
    }, [models, appleFoundationEnabled, appleFoundationAvailable]);

    useEffect(() => {
      if (sections.length > 0 && sections[0]?.data?.length > 0) {
        setIsLocalModelsExpanded(true);
      } else if (sections.length > 0 && sections[0]?.data?.length === 0) {
        setIsLocalModelsExpanded(false);
      }
    }, [sections]);

    useEffect(() => {
      refreshAppleFoundationState();
    }, []);

    useImperativeHandle(ref, () => ({
      refreshModels: () => {
        refreshStoredModels();
      }
    }));

    useEffect(() => {
      checkOnlineModelApiKeys();
    }, []);

    const checkOnlineModelApiKeys = async () => {
      try {
        const hasGeminiKey = await onlineModelService.hasApiKey('gemini');
        const hasOpenAIKey = await onlineModelService.hasApiKey('chatgpt');
        const hasDeepSeekKey = await onlineModelService.hasApiKey('deepseek');
        const hasClaudeKey = await onlineModelService.hasApiKey('claude');
        
        const newStatuses = {
          gemini: hasGeminiKey,
          chatgpt: hasOpenAIKey,
          deepseek: hasDeepSeekKey,
          claude: hasClaudeKey
        };
        
        setOnlineModelStatuses(newStatuses);
        
        if (Object.values(newStatuses).some(status => status)) {
          setIsOnlineModelsExpanded(true);
        }
      } catch (error) {
      }
    };

    const handleModelSelect = async (model: Model) => {
      setModalVisible(false);
      
      if (isGenerating) {
        showDialog(
          'Model In Use',
          'Cannot change model while generating a response. Please wait for the current generation to complete or cancel it.',
          [<Button key="ok" onPress={hideDialog}>OK</Button>]
        );
        return;
      }
      
      if ('isAppleFoundation' in model) {
        if (onModelSelect) {
          onModelSelect('apple-foundation');
        }
        return;
      }
      if ('isOnline' in model) {
        if (!enableRemoteModels || !isLoggedIn) {
          setTimeout(() => {
            showDialog(
              'Remote Models Disabled',
              'Remote models require the "Enable Remote Models" setting to be turned on and you need to be signed in. Would you like to go to Settings to configure this?',
              [
                <Button key="cancel" onPress={hideDialog}>Cancel</Button>,
                <Button 
                  key="settings" 
                  onPress={() => {
                    hideDialog();
                    if (onClose) onClose();
                    navigation.navigate('MainTabs', { screen: 'SettingsTab' });
                  }}
                >
                  Go to Settings
                </Button>
              ]
            );
          }, 300);
          return;
        }
        
        if (!onlineModelStatuses[model.id]) {
          handleApiKeyRequired(model);
          return;
        }
        
        if (onModelSelect) {
          onModelSelect(model.id as 'gemini' | 'chatgpt' | 'deepseek' | 'claude');
        }
      } else {
        const storedModel = model as StoredModel;
        const modelPath = storedModel.isExternal && storedModel.originalPath ? storedModel.originalPath : storedModel.path;
        const pathLower = modelPath.toLowerCase();
        const nameLower = (storedModel.name || '').toLowerCase();

        const engine = engineService.getEngineForModel(modelPath, storedModel.modelFormat);
        const enabled = engineService.getEnabled();

        if (!enabled[engine]) {
          showDialog(
            'Engine Disabled',
            `${engine === 'llama' ? 'Llama.cpp' : 'MLX'} is disabled. Enable it in Settings to load this model.`,
            [<Button key="ok" onPress={hideDialog}>OK</Button>]
          );
          return;
        }

        const isVisionModel = nameLower.includes('llava') || 
                             nameLower.includes('vision') ||
                             nameLower.includes('minicpm');
        
        if (isVisionModel) {
          showMultimodalDialog(storedModel);
        } else {
          if (onModelSelect) {
            onModelSelect('local', modelPath);
          } else {
            await loadModel(modelPath);
          }
        }
      }
    };

    const showMultimodalDialog = (model: Model) => {
      showDialog(
        'Vision Model Detected',
        `${model.name} appears to be a vision model. Do you want to load it with multimodal capabilities?`,
        [
          <Button 
            key="text-only" 
            onPress={() => {
              hideDialog();
              const storedModel = model as StoredModel;
              const modelPath = storedModel.isExternal && storedModel.originalPath ? storedModel.originalPath : storedModel.path;
              if (onModelSelect) {
                onModelSelect('local', modelPath);
              } else {
                loadModel(modelPath);
              }
            }}
          >
            Text Only
          </Button>,
          <Button 
            key="multimodal" 
            onPress={() => {
              hideDialog();
              promptForProjector(model);
            }}
          >
            With Vision
          </Button>
        ]
      );
    };

    const loadProjectorModels = async () => {
      try {
        const storedModels = await modelDownloader.getStoredModels();
        
        const projectorModels = storedModels.filter(model => 
          model.name.toLowerCase().includes('proj') || 
          model.name.toLowerCase().includes('mmproj') ||
          model.name.toLowerCase().includes('vision') ||
          model.name.toLowerCase().includes('clip')
        );
        setProjectorModels(projectorModels);
      } catch (error) {
        setProjectorModels([]);
      }
    };

    const promptForProjector = async (model: Model) => {
      setSelectedVisionModel(model);
      await loadProjectorModels();
      setProjectorSelectorVisible(true);
    };

    const handleProjectorSelect = async (projectorModel: StoredModel) => {
      setProjectorSelectorVisible(false);
      
      if (!selectedVisionModel) return;

      const storedModel = selectedVisionModel as StoredModel;
      const modelPath = storedModel.isExternal && storedModel.originalPath ? storedModel.originalPath : storedModel.path;
      const projectorPath = projectorModel.path;

      if (onModelSelect) {
        showDialog(
          'Multimodal Model Ready',
          `Loading ${selectedVisionModel.name} with vision capabilities using ${projectorModel.name}`,
          [<Button key="ok" onPress={hideDialog}>OK</Button>]
        );
        onModelSelect('local', modelPath, projectorPath);
      } else {
        const success = await loadModel(modelPath, projectorPath);
        if (success) {
          showDialog(
            'Success',
            'Vision model loaded successfully! You can now send images and photos.',
            [<Button key="ok" onPress={hideDialog}>OK</Button>]
          );
        }
      }
      setSelectedVisionModel(null);
    };

    const handleProjectorSkip = async () => {
      setProjectorSelectorVisible(false);
      
      if (!selectedVisionModel) return;

      const storedModel = selectedVisionModel as StoredModel;
      const modelPath = storedModel.isExternal && storedModel.originalPath ? storedModel.originalPath : storedModel.path;

      if (onModelSelect) {
        showDialog(
          'Text-Only Model Ready',
          `Loading ${selectedVisionModel.name} in text-only mode (without vision capabilities)`,
          [<Button key="ok" onPress={hideDialog}>OK</Button>]
        );
        onModelSelect('local', modelPath);
      } else {
        const success = await loadModel(modelPath);
        if (success) {
          showDialog(
            'Success',
            'Model loaded successfully in text-only mode.',
            [<Button key="ok" onPress={hideDialog}>OK</Button>]
          );
        }
      }
      setSelectedVisionModel(null);
    };

    const handleProjectorSelectorClose = () => {
      setProjectorSelectorVisible(false);
      setSelectedVisionModel(null);
    };

    const handleUnloadModel = () => {
      if (!selectedModelPath) {
        showDialog(
          'No Model Loaded',
          'There is no model currently loaded to unload.',
          [<Button key="ok" onPress={hideDialog}>OK</Button>]
        );
        return;
      }

      const title = 'Unload Model';
      const message = isGenerating
        ? 'This will stop the current generation. Are you sure you want to unload the model?'
        : 'Are you sure you want to unload the current model?';

      const actions = [
        <Button key="cancel" onPress={hideDialog}>Cancel</Button>,
        <Button key="unload" onPress={async () => {
          hideDialog();
          try {
            await unloadModel();
          } catch (error) {
            showDialog(
              'Unload Warning',
              `Model unloading completed with warnings. The model has been cleared from memory.`,
              [<Button key="ok" onPress={hideDialog}>OK</Button>]
            );
          }
        }}>
          Unload
        </Button>
      ];

      showDialog(title, message, actions);
    };

    const handleUnloadProjector = () => {
      if (!selectedProjectorPath && !isMultimodalEnabled) {
        showDialog(
          'No Projector Loaded',
          'There is no projector model currently loaded to unload.',
          [<Button key="ok" onPress={hideDialog}>OK</Button>]
        );
        return;
      }

      const title = 'Unload Projector';
      const message = isGenerating
        ? 'This will disable vision capabilities and stop the current generation. Are you sure you want to unload the projector?'
        : 'Are you sure you want to unload the projector model? This will disable vision capabilities.';

      const actions = [
        <Button key="cancel" onPress={hideDialog}>Cancel</Button>,
        <Button key="unload" onPress={async () => {
          hideDialog();
          try {
            await unloadProjector();
          } catch (error) {
            showDialog(
              'Unload Warning',
              `Projector unloading completed with warnings. Vision capabilities have been disabled.`,
              [<Button key="ok" onPress={hideDialog}>OK</Button>]
            );
          }
        }}>
          Unload Projector
        </Button>
      ];

      showDialog(title, message, actions);
    };

    const handleApiKeyRequired = (model: OnlineModel) => {
      showDialog(
        'API Key Required',
        `${model.name} by ${model.provider} requires an API key. Please configure it in Settings.`,
        [<Button key="ok" onPress={hideDialog}>OK</Button>]
      );
    };

    const toggleLocalModelsDropdown = () => {
      setIsLocalModelsExpanded(!isLocalModelsExpanded);
    };

    const renderContext: RenderContext = {
      themeColors,
      currentTheme,
      selectedModelPath,
      isGenerating: isGenerating || false,
      handleModelSelect,
      expandedGroups,
      toggleGroup,
      onlineModelStatuses,
      enableRemoteModels,
      isLoggedIn,
      isOnlineModelsExpanded,
      toggleOnlineModelsDropdown,
      hasAnyApiKey,
      isLocalModelsExpanded,
      toggleLocalModelsDropdown,
      refreshStoredModels,
      isRefreshingLocalModels
    };

    useEffect(() => {
      if (isOpen !== undefined) {
        setModalVisible(isOpen);
      }
    }, [isOpen]);

    useEffect(() => {
      if (modalVisible) {
        refreshAppleFoundationState();
      }
    }, [modalVisible]);

    const handleModalClose = () => {
      setModalVisible(false);
      onClose?.();
    };

    useEffect(() => {
      if (preselectedModelPath && models.length > 0) {
        const preselectedModel = models.find(model => model.path === preselectedModelPath);
        if (preselectedModel) {
          handleModelSelect(preselectedModel);
        }
      }
    }, [preselectedModelPath, models]);


    useEffect(() => {
      if (isGenerating && modalVisible) {
        setModalVisible(false);
      }
    }, [isGenerating]);

    useEffect(() => {
      const unsubscribe = onlineModelService.addListener('api-key-updated', () => {
        checkOnlineModelApiKeys();
      });
      
      return () => {
        unsubscribe();
      };
    }, []);

    const badgeConfig = getConnectionBadgeConfig(selectedModelPath, currentTheme);

    return (
      <>
        <TouchableOpacity
          style={[
            styles.selector, 
            { backgroundColor: themeColors.borderColor },
            (isGenerating || isModelLoading) && styles.selectorDisabled
          ]}
          onPress={() => {
            if (isGenerating) {
              showDialog(
                'Model In Use',
                'Cannot change model while generating a response. Please wait for the current generation to complete or cancel it.',
                [<Button key="ok" onPress={hideDialog}>OK</Button>]
              );
              return;
            }
            setModalVisible(true);
          }}
          disabled={isModelLoading || isGenerating}
        >
          <View style={styles.selectorContent}>
            <View style={styles.modelIconWrapper}>
              {isModelLoading ? (
                <ActivityIndicator size="small" color={getThemeAwareColor('#4a0660', currentTheme)} />
              ) : (
                <MaterialCommunityIcons
                  name={getActiveModelIcon(selectedModelPath)}
                  size={24}
                  color={selectedModelPath
                    ? getThemeAwareColor('#4a0660', currentTheme)
                    : currentTheme === 'dark'
                      ? '#fff'
                      : themeColors.text}
                />
              )}
            </View>
            <View style={styles.selectorTextContainer}>
              <Text style={[styles.selectorLabel, { color: currentTheme === 'dark' ? '#fff' : themeColors.secondaryText }]}>
                Active Model
              </Text>
              <View style={styles.modelNameContainer}>
                <Text style={[styles.selectorText, { color: currentTheme === 'dark' ? '#fff' : themeColors.text }]}>
                  {isModelLoading 
                    ? 'Loading...' 
                    : getModelNameFromPath(selectedModelPath, models)
                  }
                </Text>
                {selectedModelPath && !isModelLoading && (
                  <View style={[
                    styles.connectionTypeBadge,
                    {
                      backgroundColor: badgeConfig.backgroundColor
                    }
                  ]}>
                    <Text style={[
                      styles.connectionTypeText,
                      { color: badgeConfig.textColor }
                    ]}>
                      {badgeConfig.label}
                    </Text>
                  </View>
                )}
              </View>
              {selectedProjectorPath && !isModelLoading && (
                <>
                  <Text style={[styles.projectorLabel, { color: currentTheme === 'dark' ? '#ccc' : themeColors.secondaryText }]}>
                    Vision Projector
                  </Text>
                  <View style={styles.projectorNameContainer}>
                    <MaterialCommunityIcons 
                      name="eye" 
                      size={16} 
                      color={currentTheme === 'dark' ? '#5FD584' : '#2a8c42'} 
                    />
                    <Text style={[styles.projectorText, { color: currentTheme === 'dark' ? '#ccc' : themeColors.secondaryText }]}>
                      {getProjectorNameFromPath(selectedProjectorPath, models)}
                    </Text>
                    <View style={[
                      styles.connectionTypeBadge,
                      { backgroundColor: 'rgba(95, 213, 132, 0.15)' }
                    ]}>
                      <Text style={[styles.connectionTypeText, { color: currentTheme === 'dark' ? '#5FD584' : '#2a8c42' }]}>
                        VISION
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>
          <View style={styles.selectorActions}>
            {selectedProjectorPath && !isModelLoading && (
              <TouchableOpacity 
                onPress={handleUnloadProjector}
                style={[
                  styles.unloadButton,
                  styles.projectorUnloadButton,
                  isGenerating && styles.unloadButtonActive
                ]}
              >
                <MaterialCommunityIcons 
                  name="eye-off" 
                  size={16} 
                  color={isGenerating ? 
                    getThemeAwareColor('#d32f2f', currentTheme) : 
                    currentTheme === 'dark' ? '#5FD584' : '#2a8c42'} 
                />
              </TouchableOpacity>
            )}
            {selectedModelPath && !isModelLoading && (
              <TouchableOpacity 
                onPress={handleUnloadModel}
                style={[
                  styles.unloadButton,
                  isGenerating && styles.unloadButtonActive
                ]}
              >
                <MaterialCommunityIcons 
                  name="close" 
                  size={20} 
                  color={isGenerating ? 
                    getThemeAwareColor('#d32f2f', currentTheme) : 
                    currentTheme === 'dark' ? '#fff' : themeColors.secondaryText} 
                />
              </TouchableOpacity>
            )}
            <MaterialCommunityIcons name="chevron-right" size={20} color={currentTheme === 'dark' ? '#fff' : themeColors.secondaryText} />
          </View>
        </TouchableOpacity>

        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={handleModalClose}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: currentTheme === 'dark' ? '#fff' : themeColors.text }]}>
                  Select Model
                </Text>
                <TouchableOpacity 
                  onPress={handleModalClose}
                  style={styles.closeButton}
                >
                  <MaterialCommunityIcons name="close" size={24} color={currentTheme === 'dark' ? '#fff' : themeColors.text} />
                </TouchableOpacity>
              </View>

              <SectionList
                sections={sections}
                keyExtractor={(item) => (
                  'isMLXGroup' in item && (item as MLXGroup).isMLXGroup
                    ? (item as MLXGroup).groupKey
                    : 'path' in item
                      ? item.path
                      : item.id
                )}
                renderItem={({ item, section }) => renderItem(item, section, renderContext)}
                renderSectionHeader={({ section }) => renderSectionHeader(section, renderContext)}
                contentContainerStyle={styles.modelList}
                stickySectionHeadersEnabled={true}
                ListHeaderComponent={
                  <View>
                    {isLoadingLocalModels ? (
                      <View style={styles.emptyContainer}>
                        <ActivityIndicator size="large" color={getThemeAwareColor('#4a0660', currentTheme)} />
                        <Text style={[styles.emptyText, { color: currentTheme === 'dark' ? '#fff' : themeColors.text, marginTop: 16 }]}>
                          Loading models...
                        </Text>
                      </View>
                    ) : models.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="cube-outline" size={48} color={currentTheme === 'dark' ? '#fff' : themeColors.secondaryText} />
                        <Text style={[styles.emptyText, { color: currentTheme === 'dark' ? '#fff' : themeColors.text }]}>
                          No local models found. Download from Models tab.
                        </Text>
                      </View>
                    ) : sections[0]?.data?.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons 
                          name="cube-outline" 
                          size={48} 
                          color={currentTheme === 'dark' ? '#fff' : themeColors.secondaryText} 
                        />
                        <Text style={[styles.emptyText, { color: currentTheme === 'dark' ? '#fff' : themeColors.text }]}>
                          No local models found.{'\n'}
                          Download GGUF or MLX models from the Models tab.
                        </Text>
                      </View>
                    ) : null}
                  </View>
                }
                ListEmptyComponent={
                  sections.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <MaterialCommunityIcons name="cube-outline" size={48} color={currentTheme === 'dark' ? '#fff' : themeColors.secondaryText} />
                      <Text style={[styles.emptyText, { color: currentTheme === 'dark' ? '#fff' : themeColors.text }]}>
                        No models available. Please check your connection.
                      </Text>
                    </View>
                  ) : null
                }
              />
            </View>
          </View>
        </Modal>

        <Portal>
          <Dialog visible={dialogVisible} onDismiss={hideDialog}>
            <Dialog.Title>{dialogTitle}</Dialog.Title>
            <Dialog.Content>
              <Text variant="bodyMedium">{dialogMessage}</Text>
            </Dialog.Content>
            <Dialog.Actions>
              {dialogActions}
            </Dialog.Actions>
          </Dialog>

          <Dialog visible={projectorSelectorVisible} onDismiss={handleProjectorSelectorClose}>
            <Dialog.Title>Select Multimodal Projector</Dialog.Title>
            <Dialog.Content>
              <Text style={{ marginBottom: 16, color: currentTheme === 'dark' ? '#fff' : themeColors.text }}>
                Choose a projector (mmproj) model to enable multimodal capabilities:
              </Text>
              {projectorModels.length === 0 ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <MaterialCommunityIcons 
                    name="cube-outline" 
                    size={48} 
                    color={currentTheme === 'dark' ? '#666' : '#ccc'} 
                  />
                  <Text style={{ 
                    marginTop: 12, 
                    textAlign: 'center',
                    color: currentTheme === 'dark' ? '#ccc' : '#666' 
                  }}>
                    No projector models found in your stored models.{'\n'}
                  </Text>
                </View>
              ) : (
                projectorModels.map((model) => (
                  <TouchableOpacity
                    key={model.path}
                    style={[
                      styles.projectorModelItem,
                      { backgroundColor: currentTheme === 'dark' ? '#2a2a2a' : '#f1f1f1' }
                    ]}
                    onPress={() => handleProjectorSelect(model)}
                  >
                    <MaterialCommunityIcons
                      name="cube-outline"
                      size={20}
                      color={currentTheme === 'dark' ? '#fff' : '#000'}
                    />
                    <View style={styles.projectorModelInfo}>
                      <Text style={[
                        styles.projectorModelName,
                        { color: currentTheme === 'dark' ? '#fff' : '#000' }
                      ]}>
                        {model.name}
                      </Text>
                      <Text style={[
                        styles.projectorModelSize,
                        { color: currentTheme === 'dark' ? '#ccc' : '#666' }
                      ]}>
                        {(model.size / (1024 * 1024)).toFixed(1)} MB
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={handleProjectorSkip}>Skip</Button>
              <Button onPress={handleProjectorSelectorClose}>Cancel</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </>
    );
  }
);

export default ModelSelector;
