<script>
  import { onMount, onDestroy, tick } from 'svelte';

  const KEY = 'archify:waitlist';
  const SCROLL_TRIGGER = 0.55;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  let open = false;
  let status = 'idle'; // 'idle' | 'submitting' | 'success' | 'error'
  let email = '';
  let hp = ''; // honeypot
  let errorMsg = '';
  let lastTrigger = null;
  let dialogEl;
  let emailEl;
  let doneEl;
  let armed = false;

  function persisted() {
    try { return localStorage.getItem(KEY); } catch { return null; }
  }
  function persist(v) {
    try { localStorage.setItem(KEY, v); } catch {}
  }

  async function openModal(trigger) {
    lastTrigger = trigger || null;
    open = true;
    if (status !== 'success') status = 'idle';
    document.body.style.overflow = 'hidden';
    await tick();
    emailEl?.focus();
  }

  function closeModal() {
    open = false;
    document.body.style.overflow = '';
    if (persisted() !== 'joined') persist('dismissed');
    lastTrigger?.focus?.();
  }

  $: validEmail = EMAIL_RE.test(email.trim());

  async function submit() {
    if (hp.trim() !== '') { persist('joined'); status = 'success'; return; } // bot
    if (!validEmail) { status = 'error'; errorMsg = "That doesn't look like an email."; return; }
    status = 'submitting';
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), hp }),
      });
      if (res.ok) {
        persist('joined');
        status = 'success';
        await tick();
        doneEl?.focus();
      } else if (res.status === 429) {
        status = 'error'; errorMsg = 'One sec — try again in a moment.';
      } else if (res.status === 400) {
        status = 'error'; errorMsg = "That doesn't look like an email.";
      } else {
        status = 'error'; errorMsg = "Couldn't reach the server — try again.";
      }
    } catch {
      status = 'error'; errorMsg = "Couldn't reach the server — try again.";
    }
  }

  function onKeydown(e) {
    if (!open) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'Tab') trapFocus(e);
  }

  function trapFocus(e) {
    const sel =
      'a[href], button:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';
    const f = dialogEl?.querySelectorAll(sel);
    if (!f || f.length === 0) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // --- trigger delegation (any [data-waitlist-open] element opens the modal) ---
  function onDocClick(e) {
    const t = e.target.closest?.('[data-waitlist-open]');
    if (t) { e.preventDefault(); openModal(t); }
  }
  function onEvent() { openModal(); }

  // --- auto-fire once ---
  function onMouseOut(e) {
    if (e.clientY <= 0 && !e.relatedTarget) autoFire();
  }
  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    if (max > 0 && (window.scrollY || h.scrollTop) / max >= SCROLL_TRIGGER) autoFire();
  }
  function autoFire() {
    if (!armed) return;
    disarm();
    persist('dismissed'); // auto-fire counts as "seen" so it never repeats
    openModal();
  }
  function disarm() {
    armed = false;
    document.removeEventListener('mouseout', onMouseOut);
    window.removeEventListener('scroll', onScroll);
  }

  onMount(() => {
    document.addEventListener('click', onDocClick);
    window.addEventListener('archify:waitlist', onEvent);
    window.addEventListener('keydown', onKeydown);
    if (!persisted()) {
      armed = true;
      document.addEventListener('mouseout', onMouseOut);
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  });

  onDestroy(() => {
    if (typeof document === 'undefined') return; // SSR guard
    document.removeEventListener('click', onDocClick);
    window.removeEventListener('archify:waitlist', onEvent);
    window.removeEventListener('keydown', onKeydown);
    document.body.style.overflow = '';
    disarm();
  });
</script>

{#if open}
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <button class="absolute inset-0 bg-ink/40" aria-hidden="true" tabindex="-1" on:click={closeModal}></button>

    <div
      bind:this={dialogEl}
      class="dialog relative w-full max-w-md border border-ink bg-paper p-6 text-ink"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wl-title"
      aria-describedby="wl-desc"
    >
      <button class="absolute right-3 top-3 text-muted hover:text-ink" aria-label="Close" on:click={closeModal}>✕</button>

      <div class="mb-4 flex items-center gap-2">
        <span class="h-1.5 w-1.5 bg-redline"></span>
        <span class="text-[11px] font-semibold tracking-[0.3em] text-muted">COMING TO CHROME</span>
      </div>

      {#if status === 'success'}
        <h2 id="wl-title" class="text-xl font-semibold tracking-tight">You're on the list.</h2>
        <p id="wl-desc" class="mt-3 text-sm leading-relaxed text-ink-2">
          We'll email you once — the day Archify lands on the Chrome Web Store. Nothing else.
        </p>
        <button
          bind:this={doneEl}
          class="mt-5 border border-ink bg-ink px-4 py-2 text-[13px] font-semibold text-paper hover:border-redline hover:bg-redline"
          on:click={closeModal}>Done</button>
      {:else}
        <h2 id="wl-title" class="text-xl font-semibold tracking-tight">Be first to trace your stack.</h2>
        <p id="wl-desc" class="mt-3 text-sm leading-relaxed text-ink-2">
          Archify isn't on the Chrome Web Store yet. Drop your email and we'll send one message — the
          day it launches. No list, no spam, no follow-ups.
        </p>

        <form class="mt-5 flex flex-col gap-3" novalidate on:submit|preventDefault={submit}>
          <!-- honeypot: off-screen, hidden from AT, catches bots -->
          <div class="absolute -left-[9999px]" aria-hidden="true">
            <label>Company<input type="text" tabindex="-1" autocomplete="off" bind:value={hp} /></label>
          </div>

          <div class="flex gap-2">
            <input
              bind:this={emailEl}
              bind:value={email}
              type="email"
              required
              placeholder="you@dev.tools"
              autocomplete="email"
              aria-label="Email address"
              class="min-w-0 flex-1 border border-ink/40 bg-white px-3 py-2 text-sm outline-none focus:border-redline"
            />
            <button
              type="submit"
              disabled={status === 'submitting'}
              class="shrink-0 border border-ink bg-ink px-4 py-2 text-[13px] font-semibold text-paper hover:border-redline hover:bg-redline disabled:opacity-60"
            >{status === 'submitting' ? 'Joining…' : 'Join →'}</button>
          </div>

          {#if status === 'error'}
            <p class="text-[12px] text-redline" role="alert">{errorMsg}</p>
          {/if}

          <p class="text-[11px] leading-snug text-muted">
            One launch email. No tracking, no sharing, no newsletter — we store your address only to
            tell you when it ships.
          </p>
        </form>
      {/if}
    </div>
  </div>
{/if}

<style>
  .dialog { animation: wl-in 0.18s ease forwards; }
  @keyframes wl-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) {
    .dialog { animation: none; }
  }
</style>
