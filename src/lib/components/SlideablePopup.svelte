<script lang="ts">
    import { type Snippet } from "svelte";
    import { onDestroy } from "svelte";

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

    // Track whether content was at top when gesture started
    let atTopOnStart = false;

    function handleTouchStart(event: TouchEvent) {
        // Reset dragging state but don't start the drag yet.
        isDragging = false;
        startY = event.touches[0].clientY;
        atTopOnStart = (scrollableContent?.scrollTop ?? 0) === 0;
    }

    function handleTouchMove(event: TouchEvent) {
        const currentY = event.touches[0].clientY;
        const newDeltaY = currentY - startY;

        // Only start dragging if we began at the top and are swiping down.
        if (!isDragging && atTopOnStart && newDeltaY > 0) {
            isDragging = true;
        }

        if (isDragging) {
            // IMPORTANT: prevent default on a non-passive listener to suppress PTR
            if (event.cancelable) event.preventDefault();
            deltaY = Math.max(0, newDeltaY);
        }
    }

    function handleTouchEnd() {
        if (isDragging && deltaY > CLOSE_THRESHOLD) {
            onClose();
        }
        isDragging = false;
        deltaY = 0;
    }

    // ----- Prevent PTR / page scroll while modal is open -----
    let scrollLockY = 0;

    function setPTRDisabled(disabled: boolean) {
        const root = document.documentElement;
        const body = document.body;
        if (disabled) {
            root.classList.add("no-ptr");
            body.classList.add("no-ptr");
        } else {
            root.classList.remove("no-ptr");
            body.classList.remove("no-ptr");
        }
    }

    function lockPageScroll() {
        scrollLockY = window.scrollY;
        const body = document.body;
        body.style.position = "fixed";
        body.style.top = `-${scrollLockY}px`;
        body.style.left = "0";
        body.style.right = "0";
        body.style.width = "100%";
        setPTRDisabled(true);
    }

    function unlockPageScroll() {
        const body = document.body;
        body.style.position = "";
        body.style.top = "";
        body.style.left = "";
        body.style.right = "";
        body.style.width = "";
        setPTRDisabled(false);
        window.scrollTo(0, scrollLockY);
    }

    $effect(() => {
        if (typeof window === "undefined") return;
        if (isOpen) lockPageScroll();
        else unlockPageScroll();
    });

    onDestroy(() => {
        // safety: ensure we restore if component unmounts while open
        unlockPageScroll();
    });

    // ----- Ensure non-passive touchmove so preventDefault() works -----
    function nonPassiveTouchMove(node: HTMLElement) {
        const handler = (e: TouchEvent) => handleTouchMove(e);
        node.addEventListener("touchmove", handler, { passive: false });
        return {
            destroy() {
                node.removeEventListener("touchmove", handler as any);
            }
        };
    }
</script>

{#if isOpen}
    <div class="modal-backdrop">
        <div
            class="modal-wrapper"
            use:nonPassiveTouchMove
            ontouchstart={handleTouchStart}
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

        /* Stop scroll chaining from backdrop to viewport */
        overscroll-behavior: contain;
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

        /* Also stop scroll chaining */
        overscroll-behavior: contain;
        /* Keep vertical gesture; don't block inner scrolling */
        touch-action: pan-y;
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
        max-height: calc(100vh - var(--safe-top, 0px) - 8em); /* Ensure it doesn't exceed screen height and respects safe top */
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
        padding: 0 1rem calc(1rem + var(--safe-bottom, 0px)) 1rem;
        overflow: auto; /* This makes the content scrollable */
        /* Critical: prevent scroll from bubbling to the page (blocks PTR) */
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
    }

    @keyframes slide-up {
        from { transform: translateY(100%); }
        to   { transform: translateY(0); }
    }

    /* Global rules toggled via class when modal is open */
    :global(html.no-ptr), :global(body.no-ptr) {
        /* Chrome/Android: disables pull-to-refresh */
        overscroll-behavior-y: none;
    }
</style>
