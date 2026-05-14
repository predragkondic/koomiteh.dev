import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import {
  ConfirmDialog,
  type ConfirmVariant,
} from './ConfirmDialog';

export type { ConfirmVariant } from './ConfirmDialog';

export type ConfirmOptions = {
  title: string;
  subtitle?: string;
  content: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant: ConfirmVariant;
};

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used inside <ConfirmProvider>');
  }
  return ctx;
}

type Pending = {
  opts: ConfirmOptions;
  resolve: (value: boolean) => void;
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (opts) =>
      new Promise<boolean>((resolve) => {
        setPending((current) => {
          if (current) {
            resolve(false);
            return current;
          }
          return { opts, resolve };
        });
      }),
    [],
  );

  function settle(value: boolean) {
    setPending((current) => {
      current?.resolve(value);
      return null;
    });
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <ConfirmDialog
          open
          title={pending.opts.title}
          subtitle={pending.opts.subtitle}
          content={pending.opts.content}
          confirmLabel={pending.opts.confirmLabel}
          cancelLabel={pending.opts.cancelLabel}
          variant={pending.opts.variant}
          onConfirm={() => settle(true)}
          onCancel={() => settle(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
}
