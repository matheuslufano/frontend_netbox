import { useEffect, useRef, type ReactNode } from "react";
import { LuX } from "react-icons/lu";
import styles from "./CampaignWorkspace.module.css";

export default function CampaignDialog({
  id,
  title,
  children,
  onClose,
  busy,
  className,
}: {
  id: string;
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      id={id}
      ref={dialog}
      className={className ? `${styles.dialog} ${className}` : styles.dialog}
      aria-labelledby={`${id}-title`}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header className={styles.heading}>
        <h3 id={`${id}-title`}>{title}</h3>
        <button
          type="button"
          aria-label="Fechar"
          disabled={busy}
          onClick={onClose}
        >
          <LuX />
        </button>
      </header>
      {children}
    </dialog>
  );
}
