import { useState, useCallback, useRef } from 'react';

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
  const shownAtRef = useRef(0);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideDialog = useCallback(() => {
    const elapsed = Date.now() - shownAtRef.current;
    if (elapsed < 1000) {
      const wait = 1000 - elapsed;
      console.log('dialog_hide_delay', wait);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      hideTimeoutRef.current = setTimeout(() => {
        console.log('dialog_hide');
        setDialogVisible(false);
        hideTimeoutRef.current = null;
      }, wait);
      return;
    }

    console.log('dialog_hide');
    setDialogVisible(false);
  }, []);

  const showDialog = useCallback<ShowDialogFn>(
    (title, message, primary, secondary) => {
      console.log('dialog_show', title, message.substring(0, 80));
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      shownAtRef.current = Date.now();
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
