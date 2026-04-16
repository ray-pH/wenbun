<script lang="ts">
    import { SETTINGS_LABEL_DATA } from "$lib/constants";
    import type { Snippet } from "svelte";

    interface Props {
        children?: Snippet
        key: keyof typeof SETTINGS_LABEL_DATA,
        inputKey?: string,
        isDeckSettings?: boolean,
        isNotLinked?: (inputKey: string) => boolean,
        onReset?: (inputKey: string) => void,
        onUnlink?: (inputKey: string) => void,
    }

    const props: Props = $props();
    const data = $derived(SETTINGS_LABEL_DATA[props.key] ?? { label: '', help: '' });
    const resolvedInputKey = $derived(props.inputKey ?? props.key);
</script>

<style>
    .settings-label-title-row {
        display: flex;
        align-items: center;
        gap: 0.5em;
        margin-bottom: 0.15em;
    }
    .settings-children-row {
        display: flex;
        align-items: center;
        gap: 0.4em;
    }
    .settings-children.linked {
        opacity: 0.5;
        pointer-events: none;
    }
    .reset-button,
    .unlink-button {
        border: 1px solid #00000033;
        background: #ffffff;
        color: #000000b0;
        border-radius: 0.35em;
        padding: 0.25em 0.45em;
        cursor: pointer;
        line-height: 1;
    }
    .reset-button:hover,
    .unlink-button:hover {
        background: #00000010;
    }
    .settings-label {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        gap: 1em;
        .settings-label-help {
            color: #00000090;
            white-space: pre-line;
            font-size: 0.8em;
            max-width: 18em;
        }
    }
</style>

<div class="settings-item">
    <label class="settings-label">
        <div>
            <div class="settings-label-title-row">
                <div class="settings-label-title">{data.label}</div>
            </div>
            <div class="settings-label-help">{data.help}</div>
        </div>
        <div class="settings-children-row">
            {#if props.isDeckSettings && !props.isNotLinked?.(resolvedInputKey)}
                <button class="unlink-button" type="button" aria-label="Unlink from global settings" title="Unlink from global settings" onclick={() => props.onUnlink?.(resolvedInputKey)}>
                    <i class="fa-solid fa-link-slash"></i>
                </button>
            {/if}
            {#if props.isDeckSettings && props.isNotLinked?.(resolvedInputKey)}
                <button class="reset-button" type="button" aria-label="Reset to global settings" title="Reset to global settings" onclick={() => props.onReset?.(resolvedInputKey)}>
                    <i class="fa-solid fa-rotate-left"></i>
                </button>
            {/if}
            <div class="settings-children" class:linked={props.isDeckSettings && !props.isNotLinked?.(resolvedInputKey)}>
                {@render props.children?.()}
            </div>
        </div>
    </label>
</div>