"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/components/ui/utils";

export function Modal({ children, label, onClose, drawer = false }: {
  children: ReactNode;
  label: string;
  onClose: () => void;
  drawer?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <dialog ref={ref} aria-label={label} onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className={cn("modal-surface", drawer ? "modal-drawer" : "modal-palette")}>
      <div className={drawer ? "flex h-full flex-col" : "flex max-h-[80dvh] flex-col"}>{children}</div>
    </dialog>
  );
}
