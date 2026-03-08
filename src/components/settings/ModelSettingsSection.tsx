import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import SettingsSection from './SettingsSection';
import ModelSettingsCore, { GpuConfig } from './ModelSettingsCore';
import ModelSettingsSampling from './ModelSettingsSampling';
import ModelSettingsControls from './ModelSettingsControls';
import ModelSettingsPenalties from './ModelSettingsPenalties';
import ModelSettingsMirostat from './ModelSettingsMirostat';
import ModelSettingsDry from './ModelSettingsDry';
import ModelSettingsAdvanced from './ModelSettingsAdvanced';
import ModelSettingsModals from './ModelSettingsModals';
import { featureCaps } from '../../services/feature-availability';

type ModelSettings = {
  maxTokens: number;
  temperature: number;
  topK: number;
  topP: number;
  minP: number;
  stopWords: string[];
  systemPrompt: string;
  jinja: boolean;
  grammar: string;
  nProbs: number;
  penaltyLastN: number;
  penaltyRepeat: number;
  penaltyFreq: number;
  penaltyPresent: number;
  mirostat: number;
  mirostatTau: number;
  mirostatEta: number;
  dryMultiplier: number;
  dryBase: number;
  dryAllowedLength: number;
  dryPenaltyLastN: number;
  drySequenceBreakers: string[];
  ignoreEos: boolean;
  logitBias: Array<Array<number>>;
  seed: number;
  xtcProbability: number;
  xtcThreshold: number;
  typicalP: number;
  enableThinking: boolean;
};

export type { GpuConfig };

type ModelSettingsSectionProps = {
  modelSettings: ModelSettings;
  defaultSettings: Partial<ModelSettings>;
  error: string | null;
  onSettingsChange: (settings: Partial<ModelSettings>) => void;
  onMaxTokensPress: () => void;
  onStopWordsPress: () => void;
  onGrammarPress?: () => void;
  onSeedPress?: () => void;
  onNProbsPress?: () => void;
  onLogitBiasPress?: () => void;
  onDrySequenceBreakersPress?: () => void;
  onDialogOpen: (config: any) => void;
  defaultExpanded?: boolean;
  activeEngine?: 'llama' | 'mlx';
  engineEnabled?: Record<'llama' | 'mlx', boolean>;
  onEngineToggle?: (engine: 'llama' | 'mlx', enabled: boolean) => void;
  onOpenSystemPromptDialog?: () => void;
  onResetSystemPrompt?: () => void;
  enableRemoteModels?: boolean;
  onToggleRemoteModels?: (enabled: boolean) => void;
  gpuConfig?: GpuConfig;
  onToggleGpu?: (enabled: boolean) => void | Promise<void>;
  onGpuLayersChange?: (layers: number) => void | Promise<void>;
  showAppleFoundationToggle?: boolean;
  appleFoundationEnabled?: boolean;
  onToggleAppleFoundation?: (enabled: boolean) => void;
};

const ModelSettingsSection = ({
  modelSettings,
  defaultSettings,
  error,
  onSettingsChange,
  onMaxTokensPress,
  onStopWordsPress,
  onGrammarPress,
  onSeedPress,
  onNProbsPress,
  onLogitBiasPress,
  onDrySequenceBreakersPress,
  onDialogOpen,
  defaultExpanded = false,
  activeEngine,
  engineEnabled,
  onEngineToggle,
  onOpenSystemPromptDialog,
  onResetSystemPrompt,
  enableRemoteModels,
  onToggleRemoteModels,
  gpuConfig,
  onToggleGpu,
  onGpuLayersChange,
  showAppleFoundationToggle,
  appleFoundationEnabled,
  onToggleAppleFoundation,
}: ModelSettingsSectionProps) => {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const iconColor = currentTheme === 'dark' ? '#FFFFFF' : themeColors.primary;
  const [showModelSettings, setShowModelSettings] = useState(defaultExpanded);
  const engineKey = activeEngine === 'mlx' ? 'mlx' : 'llama';
  const caps = featureCaps[engineKey];
  
  const [showGrammarDialog, setShowGrammarDialog] = useState(false);
  const [showSeedDialog, setShowSeedDialog] = useState(false);
  const [showNProbsDialog, setShowNProbsDialog] = useState(false);
  const [showLogitBiasDialog, setShowLogitBiasDialog] = useState(false);
  const [showDrySequenceBreakersDialog, setShowDrySequenceBreakersDialog] = useState(false);
  
  const [tempGrammar, setTempGrammar] = useState('');
  const [tempSeed, setTempSeed] = useState('');
  const [tempNProbs, setTempNProbs] = useState('');
  const [tempLogitBias, setTempLogitBias] = useState('');
  const [tempDrySequenceBreakers, setTempDrySequenceBreakers] = useState('');

  return (
    <SettingsSection title="MODEL SETTINGS">
      <ModelSettingsCore
        onOpenSystemPromptDialog={onOpenSystemPromptDialog}
        onResetSystemPrompt={onResetSystemPrompt}
        systemPromptModified={defaultSettings.systemPrompt ? modelSettings.systemPrompt !== defaultSettings.systemPrompt : false}
        enableRemoteModels={enableRemoteModels}
        onToggleRemoteModels={onToggleRemoteModels}
        showAppleFoundationToggle={showAppleFoundationToggle}
        appleFoundationEnabled={appleFoundationEnabled}
        onToggleAppleFoundation={onToggleAppleFoundation}
        engineEnabled={engineEnabled}
        onEngineToggle={onEngineToggle}
        gpuConfig={gpuConfig}
        onToggleGpu={onToggleGpu}
        onGpuLayersChange={onGpuLayersChange}
        onDialogOpen={onDialogOpen}
      />

      <TouchableOpacity 
        style={styles.settingItem}
        onPress={() => setShowModelSettings(!showModelSettings)}
      >
        <View style={styles.settingLeft}>
          <View style={[styles.iconContainer, { backgroundColor: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : themeColors.primary + '20' }]}>
            <MaterialCommunityIcons name="cog-outline" size={22} color={iconColor} />
          </View>
          <View style={styles.settingTextContainer}>
            <View style={styles.labelRow}>
              <Text style={[styles.settingText, { color: themeColors.text }]}>
                Model Parameters
              </Text>
              <View style={[styles.advancedTag, { backgroundColor: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : themeColors.primary + '20' }]}>
                <Text style={[styles.advancedTagText, { color: currentTheme === 'dark' ? '#FFFFFF' : themeColors.primary }]}>
                  ADVANCED
                </Text>
              </View>
            </View>
            <Text style={[styles.settingDescription, { color: themeColors.secondaryText }]}>
              Tap to {showModelSettings ? 'hide' : 'view'} advanced settings
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons 
          name={showModelSettings ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={themeColors.secondaryText} 
        />
      </TouchableOpacity>

      {showModelSettings && (
        <>
          <ModelSettingsSampling
            modelSettings={modelSettings}
            defaultSettings={defaultSettings}
            error={error}
            onSettingsChange={onSettingsChange}
            onMaxTokensPress={onMaxTokensPress}
            onDialogOpen={onDialogOpen}
            activeEngine={activeEngine}
          />

          <ModelSettingsControls
            modelSettings={modelSettings}
            defaultSettings={defaultSettings}
            onSettingsChange={onSettingsChange}
            onStopWordsPress={onStopWordsPress}
            onGrammarDialogOpen={() => {
              if (!caps.grammar) {
                return;
              }
              setTempGrammar(modelSettings.grammar);
              setShowGrammarDialog(true);
            }}
            activeEngine={activeEngine}
          />

          <ModelSettingsPenalties
            modelSettings={modelSettings}
            defaultSettings={defaultSettings}
            onSettingsChange={onSettingsChange}
            onDialogOpen={onDialogOpen}
          />

          <ModelSettingsMirostat
            modelSettings={modelSettings}
            defaultSettings={defaultSettings}
            onSettingsChange={onSettingsChange}
            onDialogOpen={onDialogOpen}
            activeEngine={activeEngine}
          />

          <ModelSettingsDry
            modelSettings={modelSettings}
            defaultSettings={defaultSettings}
            onSettingsChange={onSettingsChange}
            onDialogOpen={onDialogOpen}
            onDrySequenceBreakersDialogOpen={() => {
              if (!caps.dry) {
                return;
              }
              setTempDrySequenceBreakers((modelSettings.drySequenceBreakers || []).join('\n'));
              setShowDrySequenceBreakersDialog(true);
            }}
            activeEngine={activeEngine}
          />

          <ModelSettingsAdvanced
            modelSettings={modelSettings}
            defaultSettings={defaultSettings}
            onSettingsChange={onSettingsChange}
            onNProbsDialogOpen={() => {
              setTempNProbs((modelSettings.nProbs ?? 0).toString());
              setShowNProbsDialog(true);
            }}
            onSeedDialogOpen={() => {
              setTempSeed((modelSettings.seed ?? -1).toString());
              setShowSeedDialog(true);
            }}
            onLogitBiasDialogOpen={() => {
              const logitBiasText = (modelSettings.logitBias || [])
                .map(([tokenId, bias]) => `${tokenId}, ${bias}`)
                .join('\n');
              setTempLogitBias(logitBiasText);
              setShowLogitBiasDialog(true);
            }}
          />
        </>
      )}

      <ModelSettingsModals
        modelSettings={modelSettings}
        defaultSettings={defaultSettings}
        onSettingsChange={onSettingsChange}
        showGrammarDialog={showGrammarDialog}
        setShowGrammarDialog={setShowGrammarDialog}
        showSeedDialog={showSeedDialog}
        setShowSeedDialog={setShowSeedDialog}
        showNProbsDialog={showNProbsDialog}
        setShowNProbsDialog={setShowNProbsDialog}
        showLogitBiasDialog={showLogitBiasDialog}
        setShowLogitBiasDialog={setShowLogitBiasDialog}
        showDrySequenceBreakersDialog={showDrySequenceBreakersDialog}
        setShowDrySequenceBreakersDialog={setShowDrySequenceBreakersDialog}
        tempGrammar={tempGrammar}
        setTempGrammar={setTempGrammar}
        tempSeed={tempSeed}
        setTempSeed={setTempSeed}
        tempNProbs={tempNProbs}
        setTempNProbs={setTempNProbs}
        tempLogitBias={tempLogitBias}
        setTempLogitBias={setTempLogitBias}
        tempDrySequenceBreakers={tempDrySequenceBreakers}
        setTempDrySequenceBreakers={setTempDrySequenceBreakers}
      />
    </SettingsSection>
  );
};

const styles = StyleSheet.create({
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
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
  advancedTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'center',
  },
  advancedTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default ModelSettingsSection;
