import type { FieldClass, RawInputAccess, InputAccessSignal } from './types';

const CARD_RE = /(card|cc[-_]?num|pan)/i;
const CVC_RE = /(cvc|cvv|csc)/i;

export function classifyField(
  tag: string, inputType: string | null, autocomplete: string | null, name: string | null,
): FieldClass {
  if (tag !== 'input') return 'other';
  const ac = autocomplete?.toLowerCase() ?? '';
  if (inputType === 'password') return 'password';
  if (ac === 'cc-csc' || CVC_RE.test(name ?? '')) return 'cvc';
  if (ac.startsWith('cc-') || CARD_RE.test(name ?? '')) return 'card';
  if (inputType === 'email' || ac === 'email') return 'email';
  if (inputType === 'text' || inputType === null) return 'text';
  return 'other';
}

export function toInputAccessSignal(raw: RawInputAccess): InputAccessSignal {
  let origin: string | null = null;
  if (raw.scriptUrl) {
    try { origin = new URL(raw.scriptUrl).hostname; } catch { origin = null; }
  }
  return {
    field: classifyField(raw.fieldTag, raw.inputType, raw.autocomplete, raw.name),
    scriptOrigin: origin,
    via: raw.via,
  };
}
