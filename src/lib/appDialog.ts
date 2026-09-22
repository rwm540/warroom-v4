export type AppDialogKind = 'toast' | 'confirm';

export interface AppDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function showInternalToast(message: string, title?: string): void {
  window.dispatchEvent(new CustomEvent('warroom_internal_dialog', {
    detail: { kind: 'toast', title, message },
  }));
}

export function confirmInternal(message: string, options: { title?: string; confirmText?: string; cancelText?: string; onConfirm?: () => void; onCancel?: () => void } = {}): void {
  window.dispatchEvent(new CustomEvent('warroom_internal_dialog', {
    detail: { kind: 'confirm', title: options.title || 'تأیید عملیات', message, confirmText: options.confirmText || 'تأیید', cancelText: options.cancelText || 'انصراف', onConfirm: options.onConfirm, onCancel: options.onCancel },
  }));
}
