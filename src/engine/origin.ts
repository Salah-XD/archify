export function registrableDomain(url: string): string | null {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return null; // relative or invalid
  }
  const labels = host.split('.').filter(Boolean);
  if (labels.length < 2) return host || null;
  return labels.slice(-2).join('.');
}

export function isThirdParty(pageHost: string, resourceUrl: string): boolean {
  const resource = registrableDomain(resourceUrl);
  if (resource === null) return false; // relative → same origin → first party
  const page = registrableDomain(`https://${pageHost}`);
  return resource !== page;
}
