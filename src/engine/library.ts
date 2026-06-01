import type { DomSignals, LibraryResult } from './types';

const startsWithAny = (list: string[], prefix: string) => list.some((c) => c.startsWith(prefix));

export function detectLibrary(s: DomSignals): LibraryResult {
  if (startsWithAny(s.classList, 'Mui'))
    return { library: 'MUI', confidence: 85, evidence: ['Mui* class'] };
  if (startsWithAny(s.classList, 'ant-'))
    return { library: 'Ant Design', confidence: 85, evidence: ['ant-* class'] };
  if (startsWithAny(s.classList, 'chakra-'))
    return { library: 'Chakra UI', confidence: 75, evidence: ['chakra-* class'] };
  if (s.classList.includes('btn') && s.classList.some((c) => c.startsWith('btn-')))
    return { library: 'Bootstrap', confidence: 70, evidence: ['btn + btn-* class'] };
  if (startsWithAny(s.dataAttributes, 'data-radix'))
    return {
      library: 'Radix UI', confidence: 68, evidence: ['data-radix-* attribute'],
      hint: {
        library: 'shadcn/ui', confidence: 22,
        note: 'shadcn/ui is Radix + Tailwind copy-pasted — indistinguishable from raw Radix at runtime.',
      },
    };
  return { library: 'unknown', confidence: 0, evidence: [] };
}
