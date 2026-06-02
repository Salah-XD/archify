import type { HostingProfile } from './types';

export function detectHosting(headers: Record<string, string>, assetOrigins: string[]): HostingProfile {
  const h: Record<string, string> = {};
  for (const k of Object.keys(headers)) h[k.toLowerCase()] = headers[k];
  const has = (k: string) => k in h;
  const val = (k: string) => h[k] ?? '';
  const server0 = val('server').toLowerCase();
  const powered = val('x-powered-by');
  const ev: string[] = [];

  let host: string | null = null;
  let cdn: string | null = null;
  let server: string | null = null;

  // platform / host
  if (has('x-vercel-id') || server0.includes('vercel')) { host = 'Vercel'; ev.push('x-vercel-id'); }
  else if (has('x-nf-request-id') || server0.includes('netlify')) { host = 'Netlify'; ev.push('x-nf-request-id'); }
  else if (has('x-github-request-id')) { host = 'GitHub Pages'; ev.push('x-github-request-id'); }

  // cdn
  if (has('cf-ray') || server0.includes('cloudflare')) { cdn = 'Cloudflare'; ev.push('cf-ray'); }
  else if (has('x-amz-cf-id') || val('via').toLowerCase().includes('cloudfront')) { cdn = 'CloudFront (AWS)'; ev.push('x-amz-cf-id'); }
  else if (has('x-served-by') && has('x-cache')) { cdn = 'Fastly'; ev.push('x-served-by'); }

  // server
  if (powered) { server = powered; ev.push(`x-powered-by: ${powered}`); }
  else if (server0 && !['cloudflare', 'vercel', 'netlify'].some((s) => server0.includes(s))) {
    server = val('server'); ev.push(`server: ${val('server')}`);
  }

  // asset-domain fallbacks
  const assets = assetOrigins.join(' ');
  if (!host && assets.includes('.vercel.app')) { host = 'Vercel'; ev.push('.vercel.app asset'); }
  if (!host && assets.includes('netlify.app')) { host = 'Netlify'; ev.push('netlify.app asset'); }
  if (!host && assets.includes('pages.dev')) { host = 'Cloudflare Pages'; ev.push('pages.dev asset'); }
  if (!cdn && assets.includes('cloudfront.net')) { cdn = 'CloudFront (AWS)'; ev.push('cloudfront.net asset'); }
  if (!cdn && assets.includes('fastly.net')) { cdn = 'Fastly'; ev.push('fastly.net asset'); }

  return { host, cdn, server, evidence: ev };
}
