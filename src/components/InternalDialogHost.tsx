import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

interface DialogState {
  kind: 'toast' | 'confirm';
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export default function InternalDialogHost() {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as DialogState;
      if (!detail) return;
      setDialog(detail);

      if (detail.kind === 'toast') {
        window.setTimeout(() => setDialog(null), 3200);
      }
    };

    window.addEventListener('warroom_internal_dialog', handler);
    return () => window.removeEventListener('warroom_internal_dialog', handler);
  }, []);

  if (!dialog) return null;

  if (dialog.kind === 'toast') {
    return (
      <div className="pointer-events-none fixed left-1/2 top-5 z-[9999] w-[min(92vw,420px)] -translate-x-1/2">
        <div className="rounded-2xl border border-cyan-500/40 bg-[#081321]/95 p-3 shadow-[0_0_30px_rgba(34,211,238,0.18)] backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
              <Check size={16} />
            </div>
            <div className="min-w-0 flex-1">
              {dialog.title && <div className="text-[11px] font-black text-cyan-200">{dialog.title}</div>}
              <p className="text-[12px] leading-6 text-slate-100">{dialog.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-[#0b1220] p-4 shadow-[0_0_45px_rgba(15,23,42,0.7)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-black text-white">{dialog.title || 'تأیید عملیات'}</div>
          <button
            type="button"
            onClick={() => {
              dialog.onCancel?.();
              setDialog(null);
            }}
            className="rounded-lg border border-slate-700 p-1.5 text-slate-300"
            aria-label="بستن"
          >
            <X size={14} />
          </button>
        </div>

        <p className="text-[12px] leading-7 text-slate-300">{dialog.message}</p>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              dialog.onCancel?.();
              setDialog(null);
            }}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-bold text-slate-200"
          >
            {dialog.cancelText || 'انصراف'}
          </button>
          <button
            type="button"
            onClick={() => {
              dialog.onConfirm?.();
              setDialog(null);
            }}
            className="rounded-xl bg-cyan-500 px-3 py-2 text-[11px] font-black text-slate-950"
          >
            {dialog.confirmText || 'تأیید'}
          </button>
        </div>
      </div>
    </div>
  );
}
