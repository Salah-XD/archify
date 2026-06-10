import type { PageProfile } from '../../engine/types';

/** Markdown export of the script inventory — the PCI DSS 6.4.3-shaped artifact. */
export function inventoryMarkdown(p: PageProfile): string {
  const rows = p.scripts ?? [];
  const date = new Date().toISOString().slice(0, 10);
  const lines = [
    `# Script inventory — ${p.host} (${date})`,
    '',
    'Generated locally by Archify (https://github.com/Salah-XD/archify). PCI DSS 6.4.3 asks for an inventory of all payment-page scripts with written justification — fill the last column.',
    '',
    '| script | origin | third-party | reads sensitive fields | justification |',
    '|---|---|---|---|---|',
  ];
  for (const r of rows) {
    const name = r.inline ? '(inline scripts)' : (r.src ?? '—');
    lines.push(`| ${name} | ${r.origin ?? '—'} | ${r.isThirdParty ? 'YES' : 'no'} | ${r.readsSensitive ? '**YES**' : 'no'} | |`);
  }
  const sec = p.security;
  lines.push('', `Summary: ${sec.totalScripts} scripts (${sec.thirdPartyScripts} third-party), ${sec.thirdPartyDomains} third-party domains, ${sec.sensitiveReaders} script(s) able to read password/card fields.`);
  return lines.join('\n');
}

const PAPER = '#f6f4ee';
const PAPER2 = '#efece1';
const INK = '#18160f';
const MUTED = '#8c8675';
const REDLINE = '#df4f25';
const SAFE = '#3f7a4e';
const MONO = 'ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace';

/** Render the shareable 1200×630 finding card. 100% local (a canvas in the popup). */
export function drawShareCard(p: PageProfile): HTMLCanvasElement {
  const W = 1200, H = 630;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d')!;

  // paper + frame + corner ticks
  x.fillStyle = PAPER; x.fillRect(0, 0, W, H);
  x.strokeStyle = INK; x.lineWidth = 2; x.strokeRect(24, 24, W - 48, H - 48);
  x.strokeStyle = REDLINE; x.lineWidth = 3;
  for (const [cx, cy, dx, dy] of [[24, 24, 1, 1], [W - 24, 24, -1, 1], [24, H - 24, 1, -1], [W - 24, H - 24, -1, -1]] as const) {
    x.beginPath(); x.moveTo(cx + dx * 18, cy); x.lineTo(cx, cy); x.lineTo(cx, cy + dy * 18); x.stroke();
  }

  // header: tick + ARCHIFY + host
  x.fillStyle = REDLINE; x.fillRect(60, 62, 12, 12);
  x.fillStyle = INK; x.font = `600 26px ${MONO}`;
  x.fillText('A R C H I F Y', 88, 76);
  x.fillStyle = MUTED; x.font = `20px ${MONO}`;
  x.fillText(p.host, W - 60 - x.measureText(p.host).width, 76);
  x.fillStyle = INK; x.fillRect(60, 100, W - 120, 1);

  // the three stats
  const sec = p.security;
  const stats: [string, string, string][] = [
    ['THIRD-PARTY SCRIPTS', `${sec.thirdPartyScripts} / ${sec.totalScripts}`, INK],
    ['THIRD-PARTY DOMAINS', `${sec.thirdPartyDomains}`, INK],
    ['CAN READ CARD / PASSWORD FIELDS', `${sec.sensitiveReaders}`, sec.sensitiveReaders > 0 ? REDLINE : SAFE],
  ];
  stats.forEach(([label, value, color], i) => {
    const sx = 60 + i * 380;
    x.fillStyle = PAPER2; x.fillRect(sx, 140, 340, 190);
    x.strokeStyle = INK; x.lineWidth = 1; x.strokeRect(sx, 140, 340, 190);
    x.fillStyle = color; x.font = `600 84px ${MONO}`;
    x.fillText(value, sx + 28, 258);
    x.fillStyle = MUTED; x.font = `17px ${MONO}`;
    wrapText(x, label, sx + 28, 296, 290, 22);
  });

  // stack chips
  const stack = (p.stack ?? []).slice(0, 6);
  x.fillStyle = MUTED; x.font = `16px ${MONO}`;
  x.fillText('STACK', 60, 396);
  let cx = 60;
  x.font = `600 22px ${MONO}`;
  for (const d of stack) {
    const w = x.measureText(d.name).width + 36;
    if (cx + w > W - 60) break;
    x.fillStyle = INK; x.fillRect(cx, 412, w, 44);
    x.fillStyle = PAPER; x.fillText(d.name, cx + 18, 441);
    cx += w + 14;
  }
  if (stack.length === 0) {
    x.fillStyle = MUTED; x.font = `20px ${MONO}`;
    x.fillText('no recognizable stack signals', 60, 440);
  }

  // footer
  x.fillStyle = INK; x.fillRect(60, 520, W - 120, 1);
  x.fillStyle = MUTED; x.font = `18px ${MONO}`;
  x.fillText('Archify — understand software. 100% local, open source.', 60, 560);
  x.fillStyle = REDLINE;
  const tag = 'github.com/Salah-XD/archify';
  x.fillText(tag, W - 60 - x.measureText(tag).width, 560);

  return c;
}

function wrapText(x: CanvasRenderingContext2D, text: string, tx: number, ty: number, maxW: number, lh: number) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const probe = line ? `${line} ${w}` : w;
    if (x.measureText(probe).width > maxW && line) {
      x.fillText(line, tx, ty); ty += lh; line = w;
    } else line = probe;
  }
  if (line) x.fillText(line, tx, ty);
}

/** Copy the card to the clipboard as PNG; fall back to a download. */
export async function exportCard(canvas: HTMLCanvasElement, host: string): Promise<'copied' | 'downloaded'> {
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) throw new Error('canvas export failed');
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return 'copied';
  } catch {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `archify-${host}-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
    return 'downloaded';
  }
}
