<script>
  export let label;
  export let value;
  export let pct = null;   // 0–100, or null to hide the gauge
  export let dim = false;
  $: filled = pct === null ? 0 : Math.max(0, Math.min(5, Math.round((pct / 100) * 5)));
</script>

<div class="flex items-center gap-2">
  <span class="w-[60px] shrink-0 text-muted">{label}</span>
  <span class="text-[12px] {dim ? 'italic text-muted' : 'font-semibold text-ink'}">{value}</span>
  {#if pct !== null}
    <span class="ml-auto flex items-center gap-1.5">
      <span class="relative block h-[6px] w-10 bg-paper-2 ring-1 ring-line">
        <span class="absolute inset-y-0 left-0 bg-ink" style="width:{pct}%"></span>
      </span>
      <span class="w-6 text-right font-mono text-[9px] text-muted">{pct}%</span>
    </span>
  {/if}
</div>
