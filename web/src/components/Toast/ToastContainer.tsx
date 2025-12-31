import React from 'react';
import Toast, { Toast as ToastType } from './Toast';
import styles from './ToastContainer.module.css';

interface ToastContainerProps {
  toasts: ToastType[];
  onClose: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};

export default ToastContainer;

