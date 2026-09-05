import type { Role } from '@prisma/client';
import { ha } from './domain';

/**
 * Dati sanitari: categoria particolare ai sensi del GDPR. Li vede chi ne ha
 * davvero bisogno per la sicurezza in campo — l'admin, chi amministra i
 * certificati e il TL, che in gara deve sapere chi ha problemi.
 */
export const puoVedereDatiMedici = (roles: Role[]) =>
  ha(roles, 'ADMIN', 'AMMINISTRAZIONE', 'TL');

export const GRUPPI_SANGUIGNI = [
  '0-',
  '0+',
  'A-',
  'A+',
  'B-',
  'B+',
  'AB-',
  'AB+',
] as const;

export type GruppoSanguigno = (typeof GRUPPI_SANGUIGNI)[number];
