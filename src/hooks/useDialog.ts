import { useState, useCallback } from 'react';

export interface BtnConfig {
  label: string;
  onPress: () => void;
}

/*
 * ShowDialogFn is the shared type for the showDialog function used across
 * screens and hooks. It accepts structured button configs instead of ReactNodes.
 */
export type ShowDialogFn = (
  title: string,
  message: string,
  primary?: BtnConfig,
  secondary?: BtnConfig
) => void;

export const useDialog = () => {
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogPrimaryText, setDialogPrimaryText] = useState<string | undefined>();
  const [dialogPrimaryPress, setDialogPrimaryPress] = useState<(() => void) | undefined>();
  const [dialogSecondaryText, setDialogSecondaryText] = useState<string | undefined>();
  const [dialogSecondaryPress, setDialogSecondaryPress] = useState<(() => void) | undefined>();

  const hideDialog = useCallback(() => {
    setDialogVisible(false);
  }, []);

  const showDialog = useCallback<ShowDialogFn>(
    (title, message, primary, secondary) => {
      setDialogTitle(title);
      setDialogMessage(message);
      const autoClose = () => setDialogVisible(false);
      setDialogPrimaryText(primary?.label ?? 'OK');
      setDialogPrimaryPress(primary ? () => primary.onPress : autoClose);
      setDialogSecondaryText(secondary?.label);
      setDialogSecondaryPress(secondary ? () => secondary.onPress : undefined);
      setDialogVisible(true);
    },
    []
  );

  return {
    dialogVisible,
    dialogTitle,
    dialogMessage,
    dialogPrimaryText,
    dialogPrimaryPress,
    dialogSecondaryText,
    dialogSecondaryPress,
    showDialog,
    hideDialog,
  };
};
