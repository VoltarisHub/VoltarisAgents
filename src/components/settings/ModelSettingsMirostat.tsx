import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import SettingSlider from '../SettingSlider';
import { featureCaps } from '../../services/feature-availability';

type ModelSettings = {
  mirostat: number;
  mirostatTau: number;
  mirostatEta: number;
};

type ModelSettingsMirostatProps = {
  modelSettings: ModelSettings;
  defaultSettings: Partial<ModelSettings>;
  onSettingsChange: (settings: Partial<ModelSettings>) => void;
  onDialogOpen: (config: any) => void;
  activeEngine?: 'llama' | 'mlx';
};

const ModelSettingsMirostat = ({
  modelSettings,
  defaultSettings,
  onSettingsChange,
  onDialogOpen,
  activeEngine,
}: ModelSettingsMirostatProps) => {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const engineKey = activeEngine === 'mlx' ? 'mlx' : 'llama';
  const caps = featureCaps[engineKey];

  return (
    <>
      <View style={[styles.sectionHeader, { borderTopColor: 'rgba(150, 150, 150, 0.1)' }]}>
        <Text style={[styles.sectionTitle, { color: themeColors.secondaryText }]}>MIROSTAT SETTINGS</Text>
      </View>

      <SettingSlider
        label="Mirostat Mode"
        value={modelSettings.mirostat ?? 0}
        defaultValue={defaultSettings.mirostat ?? 0}
        onValueChange={(value) => onSettingsChange({ mirostat: Math.round(value) })}
        minimumValue={0}
        maximumValue={2}
        step={1}
        description="Enable advanced creativity control. 0=disabled, 1=Mirostat, 2=Mirostat 2.0 (smoother)."
        disabled={!caps.mirostat}
        onPressChange={() => onDialogOpen({
          key: 'mirostat',
          label: 'Mirostat Mode',
          value: modelSettings.mirostat ?? 0,
          minimumValue: 0,
          maximumValue: 2,
          step: 1,
          description: "Enable advanced creativity control. 0=disabled, 1=Mirostat, 2=Mirostat 2.0 (smoother)."
        })}
      />

      <SettingSlider
        label="Mirostat Tau"
        value={modelSettings.mirostatTau ?? 5}
        defaultValue={defaultSettings.mirostatTau ?? 5}
        onValueChange={(value) => onSettingsChange({ mirostatTau: value })}
        minimumValue={1}
        maximumValue={10}
        step={0.1}
        description="Target creativity level for Mirostat. Higher values allow more diverse responses."
        disabled={!caps.mirostat}
        onPressChange={() => onDialogOpen({
          key: 'mirostatTau',
          label: 'Mirostat Tau',
          value: modelSettings.mirostatTau ?? 5,
          minimumValue: 1,
          maximumValue: 10,
          step: 0.1,
          description: "Target creativity level for Mirostat. Higher values allow more diverse responses."
        })}
      />

      <SettingSlider
        label="Mirostat Eta"
        value={modelSettings.mirostatEta ?? 0.1}
        defaultValue={defaultSettings.mirostatEta ?? 0.1}
        onValueChange={(value) => onSettingsChange({ mirostatEta: value })}
        minimumValue={0.01}
        maximumValue={1}
        step={0.01}
        description="How quickly Mirostat adjusts creativity. Higher values mean faster adjustments."
        disabled={!caps.mirostat}
        onPressChange={() => onDialogOpen({
          key: 'mirostatEta',
          label: 'Mirostat Eta',
          value: modelSettings.mirostatEta ?? 0.1,
          minimumValue: 0.01,
          maximumValue: 1,
          step: 0.01,
          description: "How quickly Mirostat adjusts creativity. Higher values mean faster adjustments."
        })}
      />
    </>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ModelSettingsMirostat;
