import { isThirdParty, registrableDomain } from '../engine/origin';
import { toInputAccessSignal } from '../engine/inputAccess';
import type {
  RawNetwork, RawScript, RawInputAccess,
  NetworkSignal, ScriptSignal, InputAccessSignal,
} from '../engine/types';

export class SignalStore {
  private net: NetworkSignal[] = [];
  private scripts: ScriptSignal[] = [];
  private inputs: InputAccessSignal[] = [];
  constructor(private pageHost: string) {}

  addNetwork(r: RawNetwork) {
    this.net.push({ ...r, origin: hostOf(r.url), isThirdParty: isThirdParty(this.pageHost, r.url) });
  }
  addScript(r: RawScript) {
    const tp = r.src ? isThirdParty(this.pageHost, r.src) : false;
    this.scripts.push({ src: r.src, origin: r.src ? hostOf(r.src) : null, inline: r.inline, isThirdParty: tp });
  }
  addInputAccess(r: RawInputAccess) { this.inputs.push(toInputAccessSignal(r)); }

  security() { return { network: this.net, scripts: this.scripts, inputAccess: this.inputs }; }
  reset() { this.net = []; this.scripts = []; this.inputs = []; }
}

function hostOf(url: string): string | null {
  try { return new URL(url).hostname; } catch { return registrableDomain(url); }
}
