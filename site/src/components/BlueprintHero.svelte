<script>
  import { onMount } from 'svelte';
  let go = false;
  let reduce = false;
  onMount(() => {
    reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    go = true;
  });
</script>

<div class="relative aspect-[4/3] w-full border border-ink/70 bg-paper-2/40">
  {#each [['left-0 top-0','border-l border-t'],['right-0 top-0','border-r border-t'],['left-0 bottom-0','border-l border-b'],['right-0 bottom-0','border-r border-b']] as [pos, edge], i}
    <span class="absolute {pos} h-3 w-3 border-redline {edge} transition-opacity duration-500"
          style="opacity:{go || reduce ? 1 : 0}; transition-delay:{reduce ? 0 : 200 + i * 120}ms"></span>
  {/each}

  <svg viewBox="0 0 400 300" class="h-full w-full" fill="none" stroke="currentColor" stroke-width="1.25">
    <g class="text-ink/55">
      {#each [
        'M40 60 H360','M40 60 V120','M120 120 H280','M200 120 V200','M120 200 H280',
        'M60 240 H160','M240 240 H340'
      ] as d, i}
        <path {d}
          style="stroke-dasharray:600; stroke-dashoffset:{go && !reduce ? 0 : (reduce ? 0 : 600)};
                 transition:stroke-dashoffset 900ms ease {i * 110}ms" />
      {/each}
    </g>
    <g class="text-redline" fill="currentColor" stroke="none">
      <circle cx="200" cy="120" r="3.5" style="opacity:{go || reduce ? 1 : 0};transition:opacity 400ms 800ms" />
      <circle cx="200" cy="200" r="3.5" style="opacity:{go || reduce ? 1 : 0};transition:opacity 400ms 950ms" />
    </g>
  </svg>
</div>
