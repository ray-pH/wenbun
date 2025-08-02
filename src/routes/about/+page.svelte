<script lang="ts">
    import { base } from '$app/paths';
    import TopBar from '$lib/components/TopBar.svelte';
</script>

<TopBar title="About" backUrl="{base}/"></TopBar>
<div class="container">
    Change log
    
    <h4>v0.2.0 (2025-08-02)</h4>
    <ul>
        <li>Add Mandarin alternative readings (numeric and zhuyin)</li>
        <li>Add Cantonese support and Cantonese decks</li>
        <li>Add support for Traditional characters and Chinese decks</li>
        <li>Add a button to "Ignore" card in the new card view</li>
        <li>Warn user when they are about to lose unsaved changes from the settings page</li>
    </ul>
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin: 1em;
        padding-top: 1em;
    }
</style>