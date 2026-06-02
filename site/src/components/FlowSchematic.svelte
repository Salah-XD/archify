<script>
  import { onMount } from 'svelte';
  let go = false;
  let reduce = false;
  onMount(() => {
    reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    go = true;
  });

  // The architecture reveal, top to bottom — what Archify traces from one element.
  const steps = [
    { k: 'INTERFACE',  v: 'a button on the page' },
    { k: 'COMPONENT',  v: '<LoginButton/>' },
    { k: 'API',        v: 'POST /api/login', node: true },
    { k: 'STORAGE',    v: 'JWT · localStorage' },
    { k: 'ROUTE',      v: '/dashboard', node: true },
  ];
  const shown = (i) => go || reduce ? 1 : 0;
  const delay = (i) => reduce ? 0 : 250 + i * 220;
</script>

<div class="relative w-full select-none border border-ink/70 bg-paper-2/30 px-6 py-7">
  <!-- corner registration ticks -->
  {#each [['left-0 top-0','border-l border-t'],['right-0 top-0','border-r border-t'],['left-0 bottom-0','border-l border-b'],['right-0 bottom-0','border-r border-b']] as [pos, edge], i}
    <span class="absolute {pos} h-3 w-3 border-redline {edge}"
          style="opacity:{shown(i)};transition:opacity 500ms {reduce ? 0 : i * 120}ms"></span>
  {/each}

  <div class="mb-4 flex items-center gap-2">
    <span class="h-1 w-1 bg-redline"></span>
    <span class="text-[8px] font-semibold tracking-[0.32em] text-muted">ARCHITECTURE TRACE · example.com</span>
  </div>

  <ol class="relative">
    {#each steps as s, i}
      <li class="grid grid-cols-[88px_1fr] items-center gap-3 py-1.5"
          style="opacity:{shown(i)};transform:translateY({go || reduce ? 0 : 6}px);transition:opacity 500ms {delay(i)}ms, transform 500ms {delay(i)}ms">
        <span class="text-right text-[9px] font-semibold tracking-[0.18em] text-muted">{s.k}</span>
        <span class="relative flex items-center gap-2">
          <!-- node marker -->
          <span class="relative z-10 h-2 w-2 shrink-0 {s.node ? 'bg-redline' : 'border border-ink bg-paper'}"></span>
          <span class="font-mono text-[13px] {s.node ? 'font-semibold text-ink' : 'text-ink-2'}">{s.v}</span>
        </span>
      </li>
      {#if i < steps.length - 1}
        <!-- hairline connector that draws in -->
        <li aria-hidden="true" class="grid grid-cols-[88px_1fr] gap-3">
          <span></span>
          <span class="relative ml-[3px] block h-4 w-px overflow-hidden">
            <span class="absolute inset-0 bg-line"
                  style="transform:scaleY({go || reduce ? 1 : 0});transform-origin:top;transition:transform 320ms {reduce ? 0 : delay(i) + 130}ms"></span>
          </span>
        </li>
      {/if}
    {/each}
  </ol>

  <p class="mt-4 border-t border-line pt-3 text-[10px] leading-relaxed text-muted">
    One button. Five layers. Archify traces them — locally, in your browser.
  </p>
</div>
