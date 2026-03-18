import { useState } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';

type ConfirmTone = 'default' | 'danger';

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
};

type ConfirmState = {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  tone: ConfirmTone;
};

const defaultState: ConfirmState = {
  open: false,
  title: 'Confirm Action',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  tone: 'default',
};

export const useConfirmDialog = () => {
  const [state, setState] = useState<ConfirmState>(defaultState);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = (options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
      setState({
        open: true,
        title: options.title || 'Confirm Action',
        message: options.message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        tone: options.tone || 'default',
      });
    });
  };

  const close = (value: boolean) => {
    if (resolver) {
      resolver(value);
    }
    setResolver(null);
    setState(defaultState);
  };

  const confirmDialog = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      tone={state.tone}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  );

  return { confirm, confirmDialog };
};
