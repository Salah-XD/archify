<script>
  const targets = {
    btn:   { framework: 'Next.js', type: 'Button', api: 'POST /api/auth/login' },
    card:  { framework: 'Next.js', type: 'Card', api: 'GET /api/products' },
    input: { framework: 'Next.js', type: 'Input', api: '—' },
  };
  let active = 'btn';
</script>

<section class="mx-auto max-w-5xl px-6 py-16">
  <div class="mb-6 flex items-center gap-2">
    <span class="h-1 w-1 bg-redline"></span>
    <span class="text-[10px] font-semibold tracking-[0.28em] text-ink">THE 30-SECOND DEMO</span>
    <span class="h-px flex-1 bg-line"></span>
  </div>

  <div class="grid gap-6 md:grid-cols-[1fr_300px]">
    <div class="relative border border-ink/70 bg-white p-6">
      <div class="mb-4 text-xs text-muted">example.com</div>
      <button class="mb-4 rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
        on:mouseenter={() => active = 'btn'} on:focus={() => active = 'btn'}>Log in</button>
      <div class="mb-4 w-48 rounded-lg border p-4 text-sm" role="group" aria-label="Product card"
        tabindex="0" on:mouseenter={() => active = 'card'} on:focus={() => active = 'card'}>Product card</div>
      <input class="w-48 rounded border px-2 py-1 text-sm" placeholder="email"
        on:mouseenter={() => active = 'input'} on:focus={() => active = 'input'} />
    </div>

    <div class="border border-ink bg-paper text-[12px]">
      <div class="flex items-center gap-2 border-b border-ink/80 px-2.5 py-2">
        <span class="h-1.5 w-1.5 bg-redline"></span>
        <span class="text-[10px] font-semibold tracking-[0.28em]">ARCHIFY</span>
      </div>
      <div class="space-y-1.5 p-3">
        <div class="flex justify-between"><span class="text-muted">framework</span><span class="font-semibold">{targets[active].framework}</span></div>
        <div class="flex justify-between"><span class="text-muted">type</span><span class="font-semibold">{targets[active].type}</span></div>
        <div class="flex justify-between"><span class="text-muted">api</span><span class="font-mono">{targets[active].api}</span></div>
      </div>
    </div>
  </div>
  <p class="mt-3 text-xs text-muted">Hover the elements on the left — the overlay updates, just like the extension.</p>
</section>
