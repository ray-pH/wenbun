<script lang="ts">
    import { SETTINGS_LABEL_DATA } from "$lib/constants";
    import type { Snippet } from "svelte";

    interface Props {
        children?: Snippet
        key: keyof typeof SETTINGS_LABEL_DATA,
    }
    let { children, key }: Props = $props();
    const data = SETTINGS_LABEL_DATA[key] ?? {label: '', help: ''};
</script>

<style>
    .settings-label {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        gap: 1em;
        .settings-label-help {
            color: #00000090;
            font-size: 0.8em;
            max-width: 18em;
        }
    }
</style>

<div class="settings-item">
    <label class="settings-label">
        <div>
            <div class="settings-label-title">{data.label}</div>
            <div class="settings-label-help">{data.help}</div>
        </div>
        <div class="settings-children">
            {@render children?.()}
        </div>
    </label>
</div>