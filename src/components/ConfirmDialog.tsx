import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'warning',
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          bg: 'bg-red-50',
          border: 'border-red-500',
          icon: '🚫',
          iconBg: 'bg-red-100',
          confirmBtn: 'bg-red-600 hover:bg-red-700',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-500',
          icon: '⚠️',
          iconBg: 'bg-yellow-100',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700',
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-500',
          icon: 'ℹ️',
          iconBg: 'bg-blue-100',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700',
        };
      default:
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-500',
          icon: '⚠️',
          iconBg: 'bg-yellow-100',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700',
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
      <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-w-md w-full transform transition-all animate-slide-up pointer-events-auto">
        <div className={`${styles.bg} border-l-4 ${styles.border} p-6 rounded-t-2xl`}>
          <div className="flex items-center">
            <div className={`${styles.iconBg} rounded-full w-12 h-12 flex items-center justify-center text-2xl mr-4`}>
              {styles.icon}
            </div>
            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 text-base leading-relaxed mb-6">{message}</p>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-6 py-2.5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold text-gray-700 transition-all"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-6 py-2.5 ${styles.confirmBtn} text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
