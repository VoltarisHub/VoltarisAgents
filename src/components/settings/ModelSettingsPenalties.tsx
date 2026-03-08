import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import SettingSlider from '../SettingSlider';

type ModelSettings = {
  penaltyLastN: number;
  penaltyRepeat: number;
  penaltyFreq: number;
  penaltyPresent: number;
};

type ModelSettingsPenaltiesProps = {
  modelSettings: ModelSettings;
  defaultSettings: Partial<ModelSettings>;
  onSettingsChange: (settings: Partial<ModelSettings>) => void;
  onDialogOpen: (config: any) => void;
};

const ModelSettingsPenalties = ({
  modelSettings,
  defaultSettings,
  onSettingsChange,
  onDialogOpen,
}: ModelSettingsPenaltiesProps) => {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];

  return (
    <>
      <View style={[styles.sectionHeader, { borderTopColor: 'rgba(150, 150, 150, 0.1)' }]}>
        <Text style={[styles.sectionTitle, { color: themeColors.secondaryText }]}>REPETITION PENALTIES</Text>
      </View>

      <SettingSlider
        label="Penalty Last N"
        value={modelSettings.penaltyLastN ?? 64}
        defaultValue={defaultSettings.penaltyLastN ?? 64}
        onValueChange={(value) => onSettingsChange({ penaltyLastN: Math.round(value) })}
        minimumValue={0}
        maximumValue={512}
        step={1}
        description="How far back to check for repetition. 0 disables, -1 uses context size."
        onPressChange={() => onDialogOpen({
          key: 'penaltyLastN',
          label: 'Penalty Last N',
          value: modelSettings.penaltyLastN ?? 64,
          minimumValue: 0,
          maximumValue: 512,
          step: 1,
          description: "How far back to check for repetition. 0 disables, -1 uses context size."
        })}
      />

      <SettingSlider
        label="Repetition Penalty"
        value={modelSettings.penaltyRepeat ?? 1.1}
        defaultValue={defaultSettings.penaltyRepeat ?? 1.1}
        onValueChange={(value) => onSettingsChange({ penaltyRepeat: value })}
        minimumValue={0.5}
        maximumValue={2}
        step={0.01}
        description="Discourage word repetition. Higher values make responses use more diverse language."
        onPressChange={() => onDialogOpen({
          key: 'penaltyRepeat',
          label: 'Repetition Penalty',
          value: modelSettings.penaltyRepeat ?? 1.1,
          minimumValue: 0.5,
          maximumValue: 2,
          step: 0.01,
          description: "Discourage word repetition. Higher values make responses use more diverse language."
        })}
      />

      <SettingSlider
        label="Frequency Penalty"
        value={modelSettings.penaltyFreq ?? 0}
        defaultValue={defaultSettings.penaltyFreq ?? 0}
        onValueChange={(value) => onSettingsChange({ penaltyFreq: value })}
        minimumValue={0}
        maximumValue={2}
        step={0.01}
        description="Penalize overused words. Higher values encourage using a broader vocabulary."
        onPressChange={() => onDialogOpen({
          key: 'penaltyFreq',
          label: 'Frequency Penalty',
          value: modelSettings.penaltyFreq ?? 0,
          minimumValue: 0,
          maximumValue: 2,
          step: 0.01,
          description: "Penalize overused words. Higher values encourage using a broader vocabulary."
        })}
      />

      <SettingSlider
        label="Presence Penalty"
        value={modelSettings.penaltyPresent ?? 0}
        defaultValue={defaultSettings.penaltyPresent ?? 0}
        onValueChange={(value) => onSettingsChange({ penaltyPresent: value })}
        minimumValue={0}
        maximumValue={2}
        step={0.01}
        description="Reduce repetition of themes and ideas. Higher values encourage more diverse content."
        onPressChange={() => onDialogOpen({
          key: 'penaltyPresent',
          label: 'Presence Penalty',
          value: modelSettings.penaltyPresent ?? 0,
          minimumValue: 0,
          maximumValue: 2,
          step: 0.01,
          description: "Reduce repetition of themes and ideas. Higher values encourage more diverse content."
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

export default ModelSettingsPenalties;
