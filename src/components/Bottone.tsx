'use client';

import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';
import { Icona, type NomeIcona } from './Icona';

/** Bottone di invio che si disabilita da solo mentre la server action è in corso. */
export function Invia({
  children,
  className = 'btn-primary',
  attesa = 'Attendere…',
  icona,
}: {
  children: ReactNode;
  className?: string;
  attesa?: string;
  icona?: NomeIcona;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {icona && <Icona nome={icona} size={15} />}
      {pending ? attesa : children}
    </button>
  );
}
