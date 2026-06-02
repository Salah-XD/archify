<script>
  import GaugeRow from './GaugeRow.svelte';

  const targets = {
    btn: {
      name: '<LoginButton/>', type: 'Button', typeC: 90,
      lib: 'Radix UI', libC: 68,
      api: 'POST /api/login', status: '200', ms: '312ms',
      note: 'authentication entry point',
    },
    card: {
      name: '<ProductCard/>', type: 'Card', typeC: 82,
      lib: 'shadcn/ui?', libC: 22,
      api: 'GET /api/products', status: '200', ms: '88ms',
      note: 'fetches product data on view',
    },
    input: {
      name: '<EmailField/>', type: 'Input', typeC: 88,
      lib: '—', libC: 0,
      api: '—', status: '—', ms: '',
      note: '1 third-party script can read this field',
    },
  };

  let active = 'btn';
  let cx = 0, cy = 0, inside = false;

  function move(e) {
    const r = e.currentTarget.getBoundingClientRect();
    cx = e.clientX - r.left;
    cy = e.clientY - r.top;
  }
  const set = (k) => () => (active = k);
  $: t = targets[active];
</script>

<section class="mx-auto max-w-5xl px-6 py-20">
  <div class="mb-2 flex items-center gap-2">
    <span class="h-1 w-1 bg-redline"></span>
    <span class="text-[10px] font-semibold tracking-[0.28em] text-ink">THE 30-SECOND DEMO</span>
    <span class="h-px flex-1 bg-line"></span>
  </div>
  <p class="mb-6 max-w-md text-[12px] leading-relaxed text-muted">
    Move across the page on the left. Archify reads each element and reveals the system behind it —
    component, library, the API it fires, and what touches your data.
  </p>

  <div class="grid gap-6 md:grid-cols-[1fr_320px]">
    <!-- the "foreign" page being inspected -->
    <div
      class="relative overflow-hidden border border-ink/70 bg-white p-6 {inside ? 'cursor-none' : ''}"
      role="application"
      aria-label="Interactive demo page"
      on:mousemove={move}
      on:mouseenter={() => (inside = true)}
      on:mouseleave={() => (inside = false)}
    >
      <div class="mb-5 flex items-center gap-1.5 text-xs text-muted">
        <span class="h-1.5 w-1.5 rounded-full bg-slate-300"></span>example.com
      </div>

      <button
        class="mb-4 block rounded-md bg-slate-900 px-4 py-2 text-sm text-white outline-offset-4 {active === 'btn' ? 'outline outline-1 outline-redline' : ''}"
        on:mouseenter={set('btn')} on:focus={set('btn')}>Log in</button>

      <div
        class="mb-4 w-52 rounded-lg border p-4 text-sm outline-offset-4 {active === 'card' ? 'outline outline-1 outline-redline' : ''}"
        role="group" aria-label="Product card" tabindex="0"
        on:mouseenter={set('card')} on:focus={set('card')}>Product card</div>

      <input
        class="w-52 rounded border px-2 py-1 text-sm outline-offset-4 {active === 'input' ? 'outline outline-1 outline-redline' : ''}"
        placeholder="email" on:mouseenter={set('input')} on:focus={set('input')} />

      <!-- draughtsman crosshair reticle -->
      {#if inside}
        <div class="pointer-events-none absolute inset-y-0 w-px bg-redline/40" style="left:{cx}px"></div>
        <div class="pointer-events-none absolute inset-x-0 h-px bg-redline/40" style="top:{cy}px"></div>
        <div class="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 border border-redline"
             style="left:{cx}px;top:{cy}px"></div>
        <div class="pointer-events-none absolute whitespace-nowrap bg-ink px-1.5 py-0.5 font-mono text-[9px] tracking-wide text-paper"
             style="left:{cx + 12}px;top:{cy + 12}px">▸ {t.type}</div>
      {/if}
    </div>

    <!-- the Archify instrument panel -->
    <div class="relative border border-ink bg-paper text-[12px]">
      <span class="pointer-events-none absolute -left-px -top-px h-2 w-2 border-l border-t border-redline"></span>
      <span class="pointer-events-none absolute -right-px -top-px h-2 w-2 border-r border-t border-redline"></span>
      <div class="flex items-center gap-2 border-b border-ink/80 px-2.5 py-2">
        <span class="h-1.5 w-1.5 bg-redline"></span>
        <span class="text-[10px] font-semibold tracking-[0.28em]">ARCHIFY</span>
        <span class="ml-auto font-mono text-[9px] text-muted">live</span>
      </div>

      <div class="space-y-2 p-3">
        <GaugeRow label="framework" value="Next.js" pct={96} />
        <div class="flex items-baseline justify-between">
          <span class="text-muted">component</span>
          <span class="font-mono font-semibold text-ink">{t.name}</span>
        </div>
        <GaugeRow label="type" value={t.type} pct={t.typeC} />
        <GaugeRow label="library" value={t.lib} pct={t.libC} dim={t.libC === 0} />

        <div class="border-t border-line pt-2">
          <div class="mb-1 text-[9px] font-semibold tracking-[0.24em] text-muted">TRIGGERED API</div>
          {#if t.api === '—'}
            <div class="text-[11px] text-muted/70">— none —</div>
          {:else}
            <div class="flex items-center gap-1.5 font-mono text-[11px]">
              <span class="font-semibold text-redline">{t.api.split(' ')[0]}</span>
              <span class="truncate text-ink">{t.api.split(' ')[1]}</span>
              <span class="ml-auto shrink-0 text-muted">{t.status} · {t.ms}</span>
            </div>
          {/if}
        </div>

        <div class="border-t border-line pt-2">
          <div class="mb-1 text-[9px] font-semibold tracking-[0.24em] text-muted">NOTE</div>
          <div class="text-[11px] leading-snug {active === 'input' ? 'text-redline' : 'text-ink-2'}">{t.note}</div>
        </div>
      </div>
    </div>
  </div>
</section>
