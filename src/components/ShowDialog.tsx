import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import Dialog from './Dialog';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../constants/theme';
import { useDialog } from '../context/DialogContext';

export const ShowDialog = () => {
  const { 
    visible, 
    title, 
    message, 
    confirmText, 
    cancelText, 
    showLoading,
    showTitle,
    onConfirm, 
    onCancel 
  } = useDialog();

  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme as 'light' | 'dark'];

  return (
    <>
      {showLoading ? (
        <Dialog visible={visible} onDismiss={undefined}>
          <View style={styles.loadingDialogContent}>
            <ActivityIndicator size="large" color={themeColors.primary} />
            <Text style={[styles.loadingDialogText, { color: themeColors.text }]}>
              {message}
            </Text>
          </View>
        </Dialog>
      ) : (
        <Dialog
          visible={visible}
          onDismiss={onCancel}
          style={{ backgroundColor: themeColors.background }}
          title={showTitle && title ? title : undefined}
          description={message}
          primaryButtonText={confirmText}
          onPrimaryPress={onConfirm}
          secondaryButtonText={cancelText || undefined}
          onSecondaryPress={onCancel}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  loadingDialogContent: {
    alignItems: 'center',
    gap: 16,
  },
  loadingDialogText: {
    fontSize: 16,
    textAlign: 'center',
  },
}); 
