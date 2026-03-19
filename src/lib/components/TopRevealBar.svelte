<script lang="ts">
    import { type Snippet } from "svelte";

    interface Props {
        children?: Snippet;
        /** number → px, string → any CSS unit ("5em", "2rem", "120px") */
        distance?: number | string;
    }

    let { children, distance = 200 }: Props = $props();

    let revealed = $state(false);
    let distancePx = 200;

    // Convert supplied distance into px
    function computePx(value: number | string): number {
        if (typeof value === "number") return value; // already px

        const test = document.createElement("div");
        test.style.position = "absolute";
        test.style.visibility = "hidden";
        test.style.height = value; // e.g. "5em"
        document.body.appendChild(test);
        const px = test.getBoundingClientRect().height;
        document.body.removeChild(test);
        return px;
    }

    $effect(() => {
        if (typeof window === "undefined") return;
        distancePx = computePx(distance);
    });

    function handleScroll() {
        revealed = window.scrollY > distancePx;
    }

    $effect(() => {
        if (typeof window === "undefined") return;
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    });
</script>

<div class="topbar-wrapper" class:visible={revealed}>
    <div class="topbar-panel">
        {@render children?.()}
    </div>
</div>

<style>
    .topbar-wrapper {
        position: fixed;
        top: calc(3em + var(--safe-top, 0));
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        z-index: 1500;

        opacity: 0;
        transform: translateY(-20px);
        transition: opacity 0.25s ease-out, transform 0.25s ease-out;

        pointer-events: none;
    }

    .topbar-wrapper.visible {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
    }

    .topbar-panel {
        background: #fff;
        border-radius: 8px;
        margin: 0.5rem;
        padding: 0.75rem 1rem;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
        width: 98vw;
        max-width: 34em;
    }
</style>
