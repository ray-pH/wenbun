<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        children?: Snippet
        label: string,
    }
    let { children, label }: Props = $props();
</script>

<style>
    .settings-label {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
    }
</style>

<div class="settings-item">
    <label class="settings-label">
        <span>{label}</span>
        <div>
            {@render children?.()}
        </div>
    </label>
</div>