<script lang="ts">
    interface MenuItem {
        icon: string;
        label: string;
        onclick: () => void;
        isDisabled?: () => boolean;
    }
    interface Props {
        items: MenuItem[];
        align?: 'start' | 'center' | 'end';       // desktop popover alignment
        sheetBreakpointPx?: number;               // under this width -> mobile sheet
        closeOnClick?: boolean;
        ariaLabel?: string;                       // trigger label
        blueButton?: boolean;
    }

    let {
        items,
        align = 'end',
        sheetBreakpointPx = 640,
        closeOnClick = true,
        ariaLabel = 'More options',
        blueButton = false,
    }: Props = $props();

    let open = $state(false);
    let triggerEl: HTMLButtonElement | null = null;
    let menuEl: HTMLDivElement | null = $state(null);
    let activeIndex = $state<number>(-1);
    let disabledStates = $state<boolean[]>([]);

    const menuId = `menu-${Math.random().toString(36).slice(2)}`;

    function isSheet(): boolean {
        return typeof window !== 'undefined' && window.innerWidth < sheetBreakpointPx;
    }

    function openMenu() {
        checkDisabled();
        if (open) return;
        open = true;
        queueMicrotask(() => focusItem(0));
        addGlobalListeners();
    }
    function closeMenu(focusTrigger = true) {
        checkDisabled();
        if (!open) return;
        open = false;
        activeIndex = -1;
        removeGlobalListeners();
        if (focusTrigger && triggerEl) triggerEl.focus();
    }
    function toggleMenu() {
        open ? closeMenu(false) : openMenu();
    }

    function focusItem(idx: number) {
        const buttons = menuEl?.querySelectorAll<HTMLButtonElement>('[data-menuitem]');
        if (!buttons || idx < 0 || idx >= buttons.length) return;
        activeIndex = idx;
        buttons[idx].focus();
    }

    function onTriggerKeydown(e: KeyboardEvent) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openMenu();
        }
    }
    
    function checkDisabled() {
        for (let i = 0; i < items.length; i++) {
            checkDisabledByIndex(i);
        }
    }
    
    function checkDisabledByIndex(idx: number) {
        const f = items[idx].isDisabled;
        disabledStates[idx] = f ? f() : false;
    }

    function onMenuKeydown(e: KeyboardEvent) {
        const buttons = menuEl?.querySelectorAll<HTMLButtonElement>('[data-menuitem]');
        if (!buttons) return;
        const last = buttons.length - 1;

        if (e.key === 'Escape') {
            e.preventDefault();
            closeMenu();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            focusItem(Math.min(activeIndex + 1, last));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            focusItem(Math.max(activeIndex - 1, 0));
        } else if (e.key === 'Home') {
            e.preventDefault();
            focusItem(0);
        } else if (e.key === 'End') {
            e.preventDefault();
            focusItem(last);
        } else if (e.key === 'Tab') {
            // Let tab proceed but close so focus moves naturally
            closeMenu(false);
        }
    }

    function onItemClick(item: MenuItem) {
        item.onclick?.();
        if (closeOnClick) closeMenu(false);
    }

    // click-outside + resize
    let offWindowClick: ((e: MouseEvent) => void) | null = null;
    function addGlobalListeners() {
        offWindowClick = (e: MouseEvent) => {
            const t = e.target as Node;
            if (menuEl && !menuEl.contains(t) && triggerEl && !triggerEl.contains(t)) {
                closeMenu(false);
            }
        };
        window.addEventListener('mousedown', offWindowClick, { capture: true });
        window.addEventListener('resize', handleResize);
    }
    function removeGlobalListeners() {
        if (offWindowClick) {
            window.removeEventListener('mousedown', offWindowClick, { capture: true } as any);
            offWindowClick = null;
        }
        window.removeEventListener('resize', handleResize);
    }
    function handleResize() {
        if (open) closeMenu(false);
    }

    // clean up if unmounted while open
    $effect(() => {
        return () => removeGlobalListeners();
    });
</script>

<div class="tdm-root {`align-${align}`}" data-open={open}>
    <button
        type="button"
        class="tdm-trigger"
        class:blue={blueButton}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onclick={toggleMenu}
        onkeydown={onTriggerKeydown}
        bind:this={triggerEl}
        title={ariaLabel}
    >
        <i class="fa fa-ellipsis" aria-hidden="true"></i>
        <span class="sr-only">{ariaLabel}</span>
    </button>

    {#if open}
        {#if isSheet()}
            <!-- Mobile: action sheet -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="tdm-backdrop" onclick={() => closeMenu(false)}
            ></div>
            <div
                class="tdm-sheet"
                role="menu"
                id={menuId}
                tabindex="-1"
                bind:this={menuEl}
                onkeydown={onMenuKeydown}
            >
                <ul class="tdm-list">
                    {#each items as item, i}
                        <li role="none">
                            <button
                                type="button"
                                role="menuitem"
                                class="tdm-item"
                                disabled={disabledStates[i]}
                                data-menuitem
                                onclick={() => onItemClick(item)}
                                onmouseenter={() => (activeIndex = i)}
                            >
                                <i class={item.icon} aria-hidden="true"></i>
                                <span>{item.label}</span>
                            </button>
                        </li>
                    {/each}
                </ul>
                <button type="button" class="tdm-cancel" onclick={() => closeMenu()}>
                    Cancel
                </button>
            </div>
        {:else}
            <!-- Desktop: anchored popover -->
            <div
                class="tdm-popover"
                role="menu"
                id={menuId}
                tabindex="-1"
                bind:this={menuEl}
                onkeydown={onMenuKeydown}
            >
                <ul class="tdm-list">
                    {#each items as item, i}
                        <li role="none">
                            <button
                                type="button"
                                role="menuitem"
                                disabled={disabledStates[i]}
                                class="tdm-item"
                                data-menuitem
                                onclick={() => onItemClick(item)}
                                onmouseenter={() => (activeIndex = i)}
                            >
                                <i class={item.icon} aria-hidden="true"></i>
                                <span>{item.label}</span>
                            </button>
                        </li>
                    {/each}
                </ul>
            </div>
        {/if}
    {/if}
</div>

<style>
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        border: 0;
        white-space: nowrap;
    }

    .tdm-root {
        position: relative;
        display: inline-block;
    }

    .tdm-trigger {
        all: unset;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 9999px;
        cursor: pointer;
        outline: none;
    }
    .tdm-trigger:focus-visible {
        box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.35);
    }
    .tdm-trigger:hover {
        background: var(--tdm-bg-hover, rgba(0,0,0,0.04));
    }
    
    .tdm-trigger.blue {
        background: var(--wenbun-blue);
        color: white;
        opacity: 1;
        border-radius: 0.5em;
        &:hover {
            opacity: 0.8;
        }
    }

    /* Desktop popover */
    .tdm-popover {
        position: absolute;
        z-index: 1000;
        min-width: 240px;
        max-height: min(60vh, 360px);
        overflow: auto;
        border-radius: 12px;
        border: 1px solid var(--tdm-border, rgba(0,0,0,0.12));
        background: var(--tdm-surface, #fff);
        box-shadow:
            0 8px 24px rgba(0,0,0,0.18),
            0 2px 8px rgba(0,0,0,0.12);
        margin-top: 8px;
        inset-inline-start: auto;
        inset-inline-end: 0;
        padding: 8px;
    }
    .align-start .tdm-popover { inset-inline-start: 0; inset-inline-end: auto; }
    .align-center .tdm-popover { left: 50%; transform: translateX(-50%); right: auto; }

    .tdm-list {
        list-style: none;
        margin: 0;
        padding: 0;
    }

    .tdm-item {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-height: 44px; /* comfy touch target */
        padding: 10px 12px;
        border: 0;
        background: transparent;
        border-radius: 10px;
        text-align: left;
        cursor: pointer;
        outline: none;
        font: inherit;
    }
    .tdm-item i {
        width: 1.25em;
        text-align: center;
        opacity: 0.85;
    }
    .tdm-item:hover,
    .tdm-item:focus-visible {
        background: var(--tdm-item-hover, rgba(0,0,0,0.06));
    }
    .tdm-item:active {
        transform: translateY(0.5px);
    }

    /* Mobile sheet */
    .tdm-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1000;
    }
    .tdm-sheet {
        position: fixed;
        left: 1vw;
        right: 1vw;
        bottom: 0;
        z-index: 1001;
        background: var(--tdm-surface, #fff);
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        padding: 0.75rem 1rem 1rem 1rem;
        max-height: 70vh;
        overflow: auto;
        animation: tdm-slide-up 0.2s ease-out;
    }
    .tdm-cancel {
        display: block;
        width: 100%;
        margin-top: 8px;
        min-height: 44px;
        border-radius: 12px;
        border: 1px solid var(--tdm-border, rgba(0,0,0,0.12));
        background: var(--tdm-bg, #fff);
        cursor: pointer;
    }
    @keyframes tdm-slide-up {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
    }
</style>