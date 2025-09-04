<script lang="ts">
    import { type Snippet } from "svelte";

    interface Props {
        children?: Snippet;
        isOpen: boolean;
        onClose: () => void;
    }
    let { children, isOpen = $bindable(), onClose }: Props = $props();

    // --- State for touch-to-close logic ---
    let startY = 0;
    let deltaY = $state(0);
    let isDragging = $state(false);
    // A reference to the scrollable DOM element
    let scrollableContent: HTMLElement | null = $state(null);

    const CLOSE_THRESHOLD = 100; // Drag distance in pixels to trigger close

    function handleTouchStart(event: TouchEvent) {
        // Reset dragging state but don't start the drag yet.
        isDragging = false;
        startY = event.touches[0].clientY;
    }

    function handleTouchMove(event: TouchEvent) {
        const currentY = event.touches[0].clientY;
        const newDeltaY = currentY - startY;

        // **Key logic**: Only start dragging the modal IF:
        // 1. We aren't already in "drag" mode.
        // 2. The content is scrolled all the way to the top (scrollTop === 0).
        // 3. The user is swiping downwards (newDeltaY > 0).
        if (!isDragging && scrollableContent?.scrollTop === 0 && newDeltaY > 0) {
            isDragging = true;
            // Once we decide it's a drag, prevent the browser's default scroll action.
            event.preventDefault();
        }

        if (isDragging) {
            // If we're in drag mode, update the modal's position.
            deltaY = Math.max(0, newDeltaY);
        }
        // If these conditions aren't met, `isDragging` remains false, and the browser
        // handles the touch as a normal scroll event inside the content.
    }

    function handleTouchEnd() {
        // Only trigger close logic if a drag was actually performed.
        if (isDragging) {
            if (deltaY > CLOSE_THRESHOLD) {
                onClose();
            }
        }

        // Reset state for the next interaction.
        isDragging = false;
        deltaY = 0;
    }
</script>

{#if isOpen}
    <div class="modal-backdrop">
                <div
            class="modal-wrapper"
            ontouchstart={handleTouchStart}
            ontouchmove={handleTouchMove}
            ontouchend={handleTouchEnd}
            ontouchcancel={handleTouchEnd}
            style:transform="translateY({deltaY}px)"
            class:is-dragging={isDragging}
        >
            <button class="modal-close" onclick={() => onClose()} aria-label="Close">
                <i class="fa-solid fa-xmark"></i>
            </button>

                        <div class="modal-panel">
                <div class="modal-drag-handle"></div>
                                <div class="modal-container" bind:this={scrollableContent}>
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
        align-items: flex-end; /* Aligns modal to the bottom */
        justify-content: center;
        z-index: 1000;
    }

    /* The new wrapper for positioning and dragging */
    .modal-wrapper {
        display: flex;
        flex-direction: column;
        align-items: flex-end; /* Aligns close button to the right */
        gap: 0.5rem;
        width: 98vw;
        max-width: 40em;
        
        /* Animation and transition are now on this wrapper */
        transition: transform 0.3s ease-out;
        animation: slide-up 0.2s ease-out;
    }

    .modal-wrapper.is-dragging {
        transition: none; /* Instant feedback while dragging */
    }

    /* Close button styled like the original */
    .modal-close {
        background: #fff;
        border: none;
        border-radius: 0.75em;
        padding: 0.5em 0.75em;
        font-size: 1rem;
        line-height: 1;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    }

    /* The main content panel */
    .modal-panel {
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        width: 100%;
        max-height: calc(100vh - 8em); /* Ensure it doesn't exceed screen height */
        display: flex;
        flex-direction: column;
        padding-top: 0.75rem;
    }

    .modal-drag-handle {
        width: 40px;
        height: 4px;
        background-color: #dcdcdc;
        border-radius: 2px;
        margin: 0 auto 0.5rem;
        flex-shrink: 0;
    }

    /* The scrollable content area */
    .modal-container {
        padding: 0 1rem 1rem 1rem;
        overflow: auto; /* This makes the content scrollable */
    }

    @keyframes slide-up {
        from {
            transform: translateY(100%);
        }
        to {
            transform: translateY(0);
        }
    }
</style>