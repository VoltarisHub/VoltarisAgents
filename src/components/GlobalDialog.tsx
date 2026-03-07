import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../constants/theme';

interface GlobalDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  points?: string[];
  iconName?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconColor?: string;
  buttonText?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  primaryButtonText?: string;
  primaryButtonColor?: string;
  primaryButtonTextColor?: string;
  onPrimaryPress?: () => void;
  secondaryButtonText?: string;
  secondaryButtonColor?: string;
  secondaryButtonTextColor?: string;
  onSecondaryPress?: () => void;
  dismissOnBackdropPress?: boolean;
  maxWidth?: number;
  children?: React.ReactNode;
}

const GlobalDialog: React.FC<GlobalDialogProps> = ({
  visible,
  onClose,
  title,
  description,
  points = [],
  iconName,
  iconColor,
  buttonText = 'OK',
  buttonColor,
  buttonTextColor = '#fff',
  primaryButtonText,
  primaryButtonColor,
  primaryButtonTextColor,
  onPrimaryPress,
  secondaryButtonText,
  secondaryButtonColor,
  secondaryButtonTextColor = '#fff',
  onSecondaryPress,
  dismissOnBackdropPress = false,
  maxWidth = 400,
  children,
}) => {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme as 'light' | 'dark'];
  const hasDualButtons = !!primaryButtonText && !!secondaryButtonText;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback
          onPress={dismissOnBackdropPress ? onClose : undefined}
        >
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View
          style={[
            styles.modalContent,
            { backgroundColor: themeColors.background, maxWidth },
          ]}
        >
          <View style={styles.modalHeader}>
            {iconName && (
              <MaterialCommunityIcons
                name={iconName}
                size={24}
                color={iconColor || themeColors.primary}
              />
            )}
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              {title}
            </Text>
          </View>

          {!!description && (
            <Text style={[styles.modalText, { color: themeColors.text }]}>
              {description}
            </Text>
          )}

          {points.length > 0 && (
            <View style={styles.bulletPoints}>
              {points.map((point, index) => (
                <Text
                  key={`${point}-${index}`}
                  style={[styles.bulletPoint, { color: themeColors.text }]}
                >
                  {point}
                </Text>
              ))}
            </View>
          )}

          {children}

          {hasDualButtons ? (
            <View style={styles.dualButtonRow}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.primaryButton,
                  { backgroundColor: primaryButtonColor || themeColors.primary },
                ]}
                onPress={onPrimaryPress || onClose}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    { color: primaryButtonTextColor || buttonTextColor },
                  ]}
                >
                  {primaryButtonText}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.secondaryButton,
                  { backgroundColor: secondaryButtonColor || themeColors.secondaryText },
                ]}
                onPress={onSecondaryPress || onClose}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    { color: secondaryButtonTextColor },
                  ]}
                >
                  {secondaryButtonText}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.modalButton,
                { backgroundColor: buttonColor || themeColors.primary },
              ]}
              onPress={onClose}
            >
              <Text style={[styles.modalButtonText, { color: buttonTextColor }]}>
                {buttonText}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    flexShrink: 1,
  },
  modalText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  bulletPoints: {
    marginVertical: 12,
    paddingLeft: 8,
  },
  bulletPoint: {
    fontSize: 15,
    lineHeight: 24,
  },
  modalButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  dualButtonRow: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 7,
    marginTop: 0,
  },
  secondaryButton: {
    flex: 3,
    marginTop: 0,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GlobalDialog;