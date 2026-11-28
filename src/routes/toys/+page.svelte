<script lang="ts">
    import TopBar from '$lib/components/TopBar.svelte';
    import { base } from '$app/paths';
</script>
<svelte:head><title>Toys · WenBun</title></svelte:head>
<TopBar title="Toys" backUrl={`${base}/`} />
<main>
    <h1>A little room to play</h1>
    <p>Small experiments for your Chinese learning.</p>
    <a href={`${base}/toys/tone-lab/`}>
        <i class="fa-solid fa-wave-square"></i>
        <div><h2>Tone Lab</h2><p>Listen, speak, and see how Mandarin tones move.</p><span>Pitch experiment</span></div>
    </a>
</main>
<style>
main { max-width: 36rem; margin: 3rem auto; padding: 0 1rem; } h1 { font-size: 1.6rem; } p { color: var(--theme-muted, #555); line-height: 1.6; }
a { display: flex; gap: 1.5rem; padding: 1.5rem; margin-top: 2rem; background: var(--theme-surface, #ffffff90); color: inherit; border-radius: .5rem; text-decoration: none; } a:hover { outline: 2px solid var(--wenbun-blue); } i { color: var(--wenbun-blue); font-size: 2rem; padding-top: .5rem; } h2 { margin: 0; font-size: 1.2rem; } span { color: var(--wenbun-blue); font-size: .9rem; }
</style>
