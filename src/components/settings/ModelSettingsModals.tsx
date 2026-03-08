import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Modal, TextInput, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';

type ModelSettings = {
  grammar: string;
  seed: number;
  nProbs: number;
  logitBias: Array<Array<number>>;
  drySequenceBreakers: string[];
};

type ModelSettingsModalsProps = {
  modelSettings: ModelSettings;
  defaultSettings: Partial<ModelSettings>;
  onSettingsChange: (settings: Partial<ModelSettings>) => void;
  showGrammarDialog: boolean;
  setShowGrammarDialog: (show: boolean) => void;
  showSeedDialog: boolean;
  setShowSeedDialog: (show: boolean) => void;
  showNProbsDialog: boolean;
  setShowNProbsDialog: (show: boolean) => void;
  showLogitBiasDialog: boolean;
  setShowLogitBiasDialog: (show: boolean) => void;
  showDrySequenceBreakersDialog: boolean;
  setShowDrySequenceBreakersDialog: (show: boolean) => void;
  tempGrammar: string;
  setTempGrammar: (value: string) => void;
  tempSeed: string;
  setTempSeed: (value: string) => void;
  tempNProbs: string;
  setTempNProbs: (value: string) => void;
  tempLogitBias: string;
  setTempLogitBias: (value: string) => void;
  tempDrySequenceBreakers: string;
  setTempDrySequenceBreakers: (value: string) => void;
};

const isStringDifferent = (current: string, defaultValue: string): boolean => {
  return (current || '') !== (defaultValue || '');
};

const ModelSettingsModals = ({
  modelSettings,
  defaultSettings,
  onSettingsChange,
  showGrammarDialog,
  setShowGrammarDialog,
  showSeedDialog,
  setShowSeedDialog,
  showNProbsDialog,
  setShowNProbsDialog,
  showLogitBiasDialog,
  setShowLogitBiasDialog,
  showDrySequenceBreakersDialog,
  setShowDrySequenceBreakersDialog,
  tempGrammar,
  setTempGrammar,
  tempSeed,
  setTempSeed,
  tempNProbs,
  setTempNProbs,
  tempLogitBias,
  setTempLogitBias,
  tempDrySequenceBreakers,
  setTempDrySequenceBreakers,
}: ModelSettingsModalsProps) => {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];

  return (
    <>
      <Modal
        visible={showGrammarDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGrammarDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Grammar Rules</Text>
              <TouchableOpacity onPress={() => setShowGrammarDialog(false)} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalDescription, { color: themeColors.secondaryText }]}>
              Define grammar rules in BNF format to constrain the model's output structure. Leave empty to disable grammar constraints.
            </Text>

            <ScrollView style={styles.textAreaContainer}>
              <TextInput
                style={[styles.textArea, { 
                  color: themeColors.text,
                  backgroundColor: themeColors.borderColor + '20',
                  borderColor: themeColors.borderColor,
                }]}
                value={tempGrammar}
                onChangeText={setTempGrammar}
                placeholder="Enter grammar rules in BNF format..."
                placeholderTextColor={themeColors.secondaryText}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              {defaultSettings.grammar !== undefined && isStringDifferent(tempGrammar, defaultSettings.grammar) && (
                <TouchableOpacity
                  style={[styles.resetButton, { backgroundColor: themeColors.primary + '20' }]}
                  onPress={() => setTempGrammar(defaultSettings.grammar || '')}
                >
                  <MaterialCommunityIcons name="refresh" size={20} color={themeColors.primary} />
                  <Text style={[styles.resetText, { color: themeColors.primary }]}>Reset to Default</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: themeColors.primary }]}
                onPress={() => {
                  onSettingsChange({ grammar: tempGrammar });
                  setShowGrammarDialog(false);
                }}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSeedDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSeedDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Random Seed</Text>
              <TouchableOpacity onPress={() => setShowSeedDialog(false)} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalDescription, { color: themeColors.secondaryText }]}>
              Set random number generator seed for reproducible results. Use -1 for random seed each time.
            </Text>

            <TextInput
              style={[styles.numberInput, {
                color: themeColors.text,
                backgroundColor: themeColors.borderColor + '20',
                borderColor: themeColors.borderColor,
              }]}
              value={tempSeed}
              onChangeText={setTempSeed}
              placeholder="Enter seed (-1 for random)"
              placeholderTextColor={themeColors.secondaryText}
              keyboardType="numeric"
            />

            <View style={styles.modalFooter}>
              {defaultSettings.seed !== undefined && (parseInt(tempSeed) || -1) !== defaultSettings.seed && (
                <TouchableOpacity
                  style={[styles.resetButton, { backgroundColor: themeColors.primary + '20' }]}
                  onPress={() => setTempSeed(defaultSettings.seed?.toString() || '-1')}
                >
                  <MaterialCommunityIcons name="refresh" size={20} color={themeColors.primary} />
                  <Text style={[styles.resetText, { color: themeColors.primary }]}>Reset to Default</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: themeColors.primary }]}
                onPress={() => {
                  const seedValue = parseInt(tempSeed) || -1;
                  onSettingsChange({ seed: seedValue });
                  setShowSeedDialog(false);
                }}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showNProbsDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNProbsDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Token Probabilities</Text>
              <TouchableOpacity onPress={() => setShowNProbsDialog(false)} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalDescription, { color: themeColors.secondaryText }]}>
              Number of most likely tokens to show probability scores for. Set to 0 to disable probability display.
            </Text>

            <TextInput
              style={[styles.numberInput, {
                color: themeColors.text,
                backgroundColor: themeColors.borderColor + '20',
                borderColor: themeColors.borderColor,
              }]}
              value={tempNProbs}
              onChangeText={setTempNProbs}
              placeholder="Enter number (0-10)"
              placeholderTextColor={themeColors.secondaryText}
              keyboardType="numeric"
            />

            <View style={styles.modalFooter}>
              {defaultSettings.nProbs !== undefined && (parseInt(tempNProbs) || 0) !== defaultSettings.nProbs && (
                <TouchableOpacity
                  style={[styles.resetButton, { backgroundColor: themeColors.primary + '20' }]}
                  onPress={() => setTempNProbs(defaultSettings.nProbs?.toString() || '0')}
                >
                  <MaterialCommunityIcons name="refresh" size={20} color={themeColors.primary} />
                  <Text style={[styles.resetText, { color: themeColors.primary }]}>Reset to Default</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: themeColors.primary }]}
                onPress={() => {
                  const nProbsValue = Math.max(0, Math.min(10, parseInt(tempNProbs) || 0));
                  onSettingsChange({ nProbs: nProbsValue });
                  setShowNProbsDialog(false);
                }}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showLogitBiasDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogitBiasDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Logit Bias</Text>
              <TouchableOpacity onPress={() => setShowLogitBiasDialog(false)} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalDescription, { color: themeColors.secondaryText }]}>
              Influence how likely specific tokens are to appear. Format: [token_id, bias] per line. Example: "123, 0.5" to make token 123 more likely.
            </Text>

            <ScrollView style={styles.textAreaContainer}>
              <TextInput
                style={[styles.textArea, { 
                  color: themeColors.text,
                  backgroundColor: themeColors.borderColor + '20',
                  borderColor: themeColors.borderColor,
                }]}
                value={tempLogitBias}
                onChangeText={setTempLogitBias}
                placeholder="Enter token_id, bias pairs (one per line)&#10;Example:&#10;123, 0.5&#10;456, -1.0"
                placeholderTextColor={themeColors.secondaryText}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              {tempLogitBias !== '' && (
                <TouchableOpacity
                  style={[styles.resetButton, { backgroundColor: themeColors.primary + '20' }]}
                  onPress={() => setTempLogitBias('')}
                >
                  <MaterialCommunityIcons name="refresh" size={20} color={themeColors.primary} />
                  <Text style={[styles.resetText, { color: themeColors.primary }]}>Clear All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: themeColors.primary }]}
                onPress={() => {
                  try {
                    const lines = tempLogitBias.split('\n').filter(line => line.trim());
                    const logitBias = lines.map(line => {
                      const [tokenId, bias] = line.split(',').map(s => parseFloat(s.trim()));
                      return [tokenId || 0, bias || 0];
                    }).filter(([tokenId, bias]) => !isNaN(tokenId) && !isNaN(bias));
                    onSettingsChange({ logitBias });
                    setShowLogitBiasDialog(false);
                  } catch (error) {
                    onSettingsChange({ logitBias: [] });
                    setShowLogitBiasDialog(false);
                  }
                }}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDrySequenceBreakersDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDrySequenceBreakersDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>DRY Sequence Breakers</Text>
              <TouchableOpacity onPress={() => setShowDrySequenceBreakersDialog(false)} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalDescription, { color: themeColors.secondaryText }]}>
              Enter symbols that reset the repetition checker in DRY mode. Each symbol should be on a new line.
            </Text>

            <ScrollView style={styles.textAreaContainer}>
              <TextInput
                style={[styles.textArea, { 
                  color: themeColors.text,
                  backgroundColor: themeColors.borderColor + '20',
                  borderColor: themeColors.borderColor,
                }]}
                value={tempDrySequenceBreakers}
                onChangeText={setTempDrySequenceBreakers}
                placeholder="Enter sequence breakers (one per line)&#10;Example:&#10;.&#10;!&#10;?"
                placeholderTextColor={themeColors.secondaryText}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              {(tempDrySequenceBreakers.split('\n').filter(s => s.trim()).length !== (defaultSettings.drySequenceBreakers || []).length ||
                !tempDrySequenceBreakers.split('\n').filter(s => s.trim()).every((item, index) => item === (defaultSettings.drySequenceBreakers || [])[index])) && (
                <TouchableOpacity
                  style={[styles.resetButton, { backgroundColor: themeColors.primary + '20' }]}
                  onPress={() => setTempDrySequenceBreakers((defaultSettings.drySequenceBreakers || []).join('\n'))}
                >
                  <MaterialCommunityIcons name="refresh" size={20} color={themeColors.primary} />
                  <Text style={[styles.resetText, { color: themeColors.primary }]}>Reset to Default</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: themeColors.primary }]}
                onPress={() => {
                  const drySequenceBreakers = tempDrySequenceBreakers
                    .split('\n')
                    .map(s => s.trim())
                    .filter(s => s.length > 0);
                  onSettingsChange({ drySequenceBreakers });
                  setShowDrySequenceBreakersDialog(false);
                }}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  textAreaContainer: {
    maxHeight: 200,
    marginBottom: 20,
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  numberInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalFooter: {
    gap: 12,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    padding: 8,
    borderRadius: 8,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ModelSettingsModals;
