"use client";

import { useRef, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/modal";

export function ConfirmableForm({ action, confirmation, children, className }: {
  action: (formData: FormData) => void;
  confirmation?: string;
  children: ReactNode;
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const confirmed = useRef(false);
  return <>
    <form ref={form} action={action} className={className} onSubmit={(event) => {
      if (confirmation && !confirmed.current) { event.preventDefault(); setConfirming(true); }
      confirmed.current = false;
    }}>{children}</form>
    {confirming ? <Modal label="Confirmar ação" onClose={() => setConfirming(false)}>
      <div className="p-6"><h2 className="section-title">Confira antes de continuar</h2><p className="mt-3 text-sm leading-6 muted-text">{confirmation}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row"><button type="button" className="button-secondary" onClick={() => setConfirming(false)}>Voltar</button><button type="button" className="button-primary" onClick={() => {
          confirmed.current = true;
          form.current?.requestSubmit();
          setConfirming(false);
        }}>Confirmar</button></div>
      </div>
    </Modal> : null}
  </>;
}
