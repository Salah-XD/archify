import { isThirdParty, registrableDomain } from '../engine/origin';
import { toInputAccessSignal } from '../engine/inputAccess';
import type {
  RawNetwork, RawScript, RawInputAccess,
  NetworkSignal, ScriptSignal, InputAccessSignal,
} from '../engine/types';

// Long-lived pages (dashboards, chat apps) fire endless XHRs; cap each signal
// list so the store can't grow without bound over a session.
const CAP = 800;

export class SignalStore {
  private net: NetworkSignal[] = [];
  private scripts: ScriptSignal[] = [];
  private inputs: InputAccessSignal[] = [];
  constructor(private pageHost: string) {}

  addNetwork(r: RawNetwork) {
    this.net.push({ ...r, origin: hostOf(r.url), isThirdParty: isThirdParty(this.pageHost, r.url) });
    if (this.net.length > CAP) this.net.shift();
  }
  addScript(r: RawScript) {
    // Skip non-http(s) scripts — notably our own chrome-extension://…/injected.js,
    // which must never inflate the page's third-party counts.
    if (r.src && !/^https?:/i.test(r.src)) return;
    const tp = r.src ? isThirdParty(this.pageHost, r.src) : false;
    this.scripts.push({ src: r.src, origin: r.src ? hostOf(r.src) : null, inline: r.inline, isThirdParty: tp });
    if (this.scripts.length > CAP) this.scripts.shift();
  }
  addInputAccess(r: RawInputAccess) {
    this.inputs.push(toInputAccessSignal(r));
    if (this.inputs.length > CAP) this.inputs.shift();
  }

  security() { return { network: this.net, scripts: this.scripts, inputAccess: this.inputs }; }
  reset() { this.net = []; this.scripts = []; this.inputs = []; }
}

function hostOf(url: string): string | null {
  try { return new URL(url).hostname; } catch { return registrableDomain(url); }
}
