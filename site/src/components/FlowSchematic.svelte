<script>
  import { onMount } from 'svelte';
  // Default REST state is fully visible (no-JS safe, reduced-motion safe).
  // `animate` only turns ON the entrance motion as an enhancement.
  let animate = false;
  onMount(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) animate = true;
  });

  // The architecture reveal, top to bottom — what Archify traces from one element.
  const steps = [
    { k: 'INTERFACE',  v: 'a button on the page' },
    { k: 'COMPONENT',  v: '<LoginButton/>' },
    { k: 'API',        v: 'POST /api/login', node: true },
    { k: 'STORAGE',    v: 'JWT · localStorage' },
    { k: 'ROUTE',      v: '/dashboard', node: true },
  ];
</script>

<div class="schematic relative w-full select-none border border-ink/70 bg-paper-2/30 px-6 py-7" class:animate>
  <!-- corner registration ticks -->
  {#each [['left-0 top-0','border-l border-t'],['right-0 top-0','border-r border-t'],['left-0 bottom-0','border-l border-b'],['right-0 bottom-0','border-r border-b']] as [pos, edge], i}
    <span class="tick absolute {pos} h-3 w-3 border-redline {edge}" style="--i:{i}"></span>
  {/each}

  <div class="mb-4 flex items-center gap-2">
    <span class="h-1 w-1 bg-redline"></span>
    <span class="text-[8px] font-semibold tracking-[0.32em] text-muted">ARCHITECTURE TRACE · example.com</span>
  </div>

  <ol class="relative">
    {#each steps as s, i}
      <li class="step grid grid-cols-[88px_1fr] items-center gap-3 py-1.5" style="--i:{i}">
        <span class="text-right text-[9px] font-semibold tracking-[0.18em] text-muted">{s.k}</span>
        <span class="relative flex items-center gap-2">
          <span class="relative z-10 h-2 w-2 shrink-0 {s.node ? 'bg-redline' : 'border border-ink bg-paper'}"></span>
          <span class="font-mono text-[13px] {s.node ? 'font-semibold text-ink' : 'text-ink-2'}">{s.v}</span>
        </span>
      </li>
      {#if i < steps.length - 1}
        <li aria-hidden="true" class="grid grid-cols-[88px_1fr] gap-3">
          <span></span>
          <span class="relative ml-[3px] block h-4 w-px overflow-hidden">
            <span class="conn absolute inset-0 bg-line" style="--i:{i}"></span>
          </span>
        </li>
      {/if}
    {/each}
  </ol>

  <p class="mt-4 border-t border-line pt-3 text-[10px] leading-relaxed text-muted">
    One button. Five layers. Archify traces them — locally, in your browser.
  </p>
</div>

<style>
  /* REST = fully visible. If JS never runs or motion is reduced, everything shows. */
  .schematic.animate .step { opacity: 0; transform: translateY(6px); animation: arch-rise 0.5s ease forwards; animation-delay: calc(250ms + var(--i) * 220ms); }
  .schematic.animate .tick { opacity: 0; animation: arch-fade 0.5s ease forwards; animation-delay: calc(var(--i) * 120ms); }
  .schematic.animate .conn { transform: scaleY(0); transform-origin: top; animation: arch-draw 0.32s ease forwards; animation-delay: calc(380ms + var(--i) * 220ms); }
  @keyframes arch-rise { to { opacity: 1; transform: none; } }
  @keyframes arch-fade { to { opacity: 1; } }
  @keyframes arch-draw { to { transform: scaleY(1); } }
</style>
