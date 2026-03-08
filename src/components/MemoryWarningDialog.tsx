import React from 'react';
import GlobalDialog from './Dialog';

interface MemoryWarningDialogProps {
  visible: boolean;
  memoryWarningType: string;
  onClose: () => void;
}

const MemoryWarningDialog: React.FC<MemoryWarningDialogProps> = ({
  visible,
  memoryWarningType,
  onClose,
}) => {
  const getWarningContent = () => {
    if (memoryWarningType === 'very_low_memory') {
      return {
        title: 'Very Low Memory Device',
        message: 'Your device has less than 2GB of RAM. Performance may be severely limited:',
        points: [
          '• Large models may not run at all',
          '• App may crash frequently',
          '• Generation will be very slow',
          '• Consider using smaller models only',
        ],
      };
    } else {
      return {
        title: 'Low Memory Device',
        message: 'Your device has limited RAM (less than 4GB). You may experience:',
        points: [
          '• Slower model loading times',
          '• Limited support for large models',
          '• Occasional app crashes with large models',
          '• Better performance with smaller models',
        ],
      };
    }
  };

  const { title, message, points } = getWarningContent();

  const warningColor = memoryWarningType === 'very_low_memory' ? '#F44336' : '#FF9800';

  return (
    <GlobalDialog
      visible={visible}
      onClose={onClose}
      title={title}
      description={message}
      points={points}
      iconName="memory"
      iconColor={warningColor}
      buttonText="Got it"
      buttonColor={warningColor}
    />
  );
};

export default MemoryWarningDialog;
