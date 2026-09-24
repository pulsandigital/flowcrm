import {
  ToastProvider, ToastViewport, Toast, ToastClose,
  ToastTitle, ToastDescription, toastIcons,
} from './toast';
import { useToastState } from '../../hooks/useToast';

export function Toaster() {
  const toasts = useToastState();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, variant = 'default' }) => (
        <Toast key={id} variant={variant}>
          {toastIcons[variant]}
          <div className="flex-1 min-w-0">
            <ToastTitle>{title}</ToastTitle>
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
