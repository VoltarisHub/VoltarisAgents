import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Switch, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import InferenceEngineSection from './InferenceEngine';

export type GpuConfig = {
  label: string;
  description: string;
  enabled: boolean;
  supported: boolean;
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  reason?: 'ios_version' | 'no_adreno' | 'missing_cpu_features' | 'unknown';
  experimental?: boolean;
};

type ModelSettingsCoreProps = {
  onOpenSystemPromptDialog?: () => void;
  onResetSystemPrompt?: () => void;
  systemPromptModified?: boolean;
  enableRemoteModels?: boolean;
  onToggleRemoteModels?: (enabled: boolean) => void;
  showAppleFoundationToggle?: boolean;
  appleFoundationEnabled?: boolean;
  onToggleAppleFoundation?: (enabled: boolean) => void;
  engineEnabled?: Record<'llama' | 'mlx', boolean>;
  onEngineToggle?: (engine: 'llama' | 'mlx', enabled: boolean) => void;
  gpuConfig?: GpuConfig;
  onToggleGpu?: (enabled: boolean) => void | Promise<void>;
  onGpuLayersChange?: (layers: number) => void | Promise<void>;
  onDialogOpen: (config: any) => void;
};

const ModelSettingsCore = ({
  onOpenSystemPromptDialog,
  onResetSystemPrompt,
  systemPromptModified,
  enableRemoteModels,
  onToggleRemoteModels,
  showAppleFoundationToggle,
  appleFoundationEnabled,
  onToggleAppleFoundation,
  engineEnabled,
  onEngineToggle,
  gpuConfig,
  onToggleGpu,
}: ModelSettingsCoreProps) => {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const iconColor = currentTheme === 'dark' ? '#FFFFFF' : themeColors.primary;

  const showGpuSettings = Boolean(
    gpuConfig &&
    onToggleGpu
  );

  const gpuSupportMessage = React.useMemo(() => {
    if (!gpuConfig) {
      return null;
    }

    if (gpuConfig.supported && gpuConfig.reason !== 'unknown') {
      return null;
    }

    switch (gpuConfig.reason) {
      case 'ios_version':
        return 'Metal acceleration requires iOS 18 or newer.';
      case 'no_adreno':
        return 'OpenCL acceleration needs an Adreno GPU.';
      case 'missing_cpu_features':
        return 'This CPU has missing required features for acceleration.';
      case 'unknown':
        return Platform.OS === 'android'
          ? 'Device GPU capabilities could not be verified. Results may vary.'
          : null;
      default:
        return null;
    }
  }, [gpuConfig]);

  return (
    <>
      {onOpenSystemPromptDialog && (
        <TouchableOpacity 
          style={[styles.settingItem, styles.settingItemBottomBorder]}
          onPress={onOpenSystemPromptDialog}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : themeColors.primary + '20' }]}>
              <MaterialCommunityIcons name="message-text-outline" size={22} color={iconColor} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingText, { color: themeColors.text }]}>
                System Prompt
              </Text>
              <Text style={[styles.settingDescription, { color: themeColors.secondaryText }]}>
                Define what should the AI know about you and your preferences
              </Text>
              {systemPromptModified && onResetSystemPrompt && (
                <TouchableOpacity
                  onPress={onResetSystemPrompt}
                  style={[styles.resetButton, { backgroundColor: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : themeColors.primary + '20' }]}
                >
                  <MaterialCommunityIcons name="refresh" size={14} color={iconColor} />
                  <Text style={[styles.resetText, { color: iconColor }]}>Reset to Default</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={themeColors.secondaryText} />
        </TouchableOpacity>
      )}

      {enableRemoteModels !== undefined && onToggleRemoteModels && (
        <View style={[styles.settingItem, styles.settingItemBottomBorder]}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : themeColors.primary + '20' }]}>
              <MaterialCommunityIcons 
                name="cloud-outline"
                size={22} 
                color={iconColor} 
              />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingText, { color: themeColors.text }]}>
                Enable Remote Models
              </Text>
              <Text style={[styles.settingDescription, { color: themeColors.secondaryText }]}>
                Access cloud-based AI models (Gemini, ChatGPT, Claude)
              </Text>
            </View>
          </View>
          <Switch
            value={enableRemoteModels}
            onValueChange={onToggleRemoteModels}
            trackColor={{ false: themeColors.borderColor, true: themeColors.primary + '80' }}
            thumbColor={enableRemoteModels ? themeColors.primary : themeColors.background}
          />
        </View>
      )}

      {showAppleFoundationToggle && onToggleAppleFoundation && (
        <View style={[styles.settingItem, styles.settingItemBottomBorder]}> 
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : themeColors.primary + '20' }]}>
              <MaterialCommunityIcons
                name="apple"
                size={22}
                color={iconColor}
              />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingText, { color: themeColors.text }]}> 
                Enable Apple Foundation
              </Text>
              <Text style={[styles.settingDescription, { color: themeColors.secondaryText }]}> 
                Use Apple Intelligence models when available
              </Text>
            </View>
          </View>
          <Switch
            value={Boolean(appleFoundationEnabled)}
            onValueChange={onToggleAppleFoundation}
            trackColor={{ false: themeColors.borderColor, true: themeColors.primary + '80' }}
            thumbColor={appleFoundationEnabled ? themeColors.primary : themeColors.background}
          />
        </View>
      )}

      {engineEnabled && onEngineToggle && (
        <InferenceEngineSection
          enabled={engineEnabled}
          onToggle={onEngineToggle}
        />
      )}

      {showGpuSettings && gpuConfig && (
        <>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor:
                      currentTheme === 'dark'
                        ? 'rgba(255, 255, 255, 0.2)'
                        : themeColors.primary + '20',
                  },
                ]}
              >
                <MaterialCommunityIcons name="chip" size={22} color={iconColor} />
              </View>
              <View style={styles.settingTextContainer}>
                <View style={styles.labelRow}>
                  <Text style={[styles.settingText, { color: themeColors.text }]}>
                    {gpuConfig.label}
                  </Text>
                  {gpuConfig.experimental && (
                    <View
                      style={[
                        styles.gpuBadge,
                        {
                          backgroundColor:
                            currentTheme === 'dark'
                              ? 'rgba(255, 255, 255, 0.2)'
                              : themeColors.primary + '20',
                        },
                      ]}
                    >
                      <Text style={[styles.gpuBadgeText, { color: iconColor }]}>EXPERIMENTAL</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.settingDescription, { color: themeColors.secondaryText }]}>
                  {gpuConfig.description}
                </Text>
                {gpuSupportMessage && (
                  <Text style={[styles.gpuSupportText, { color: themeColors.secondaryText }]}>
                    {gpuSupportMessage}
                  </Text>
                )}
              </View>
            </View>
            <Switch
              value={gpuConfig.enabled}
              onValueChange={value => onToggleGpu?.(value)}
              disabled={!gpuConfig.supported}
              trackColor={{ false: themeColors.borderColor, true: themeColors.primary + '80' }}
              thumbColor={gpuConfig.enabled ? themeColors.primary : themeColors.background}
            />
          </View>
        </>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingItemBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  settingItemBottomBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    padding: 4,
    borderRadius: 4,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '500',
  },
  gpuBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  gpuBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  gpuSupportText: {
    fontSize: 12,
    marginTop: 6,
  },
  disabledSettingItem: {
    opacity: 0.5,
  },
});

export default ModelSettingsCore;
