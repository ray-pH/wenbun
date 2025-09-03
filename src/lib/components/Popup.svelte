<script lang="ts">
    import { type Snippet } from "svelte";
    
    interface Props {
        children?: Snippet,
        isOpen: boolean;
        onClose: () => void;
    }
    let { children, isOpen = $bindable(), onClose }: Props = $props();
</script>

{#if isOpen}
    <div class="modal-backdrop">
        <div class="modal-wrapper">
            <div class="modal-box">
                <button class="modal-close" onclick={() => onClose()} aria-label="Close">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <div class="modal-container">
                    {@render children?.()}
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .modal-box {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5em;
    }

    .modal-container {
        background: #fff;
        border-radius: 8px;
        padding: 1rem;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        width: 90vw;
        max-width: 40em;
        max-height: calc(100vh - 5em);
        overflow: auto;
    }

    .modal-close {
        align-self: flex-end;
        background: #fff;
        border: none;
        border-radius: 0.75em;
        padding: 0.5em 0.75em;
        font-size: 1rem;
        line-height: 1;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    }
</style>
