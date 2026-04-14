<script lang="ts">
    import TopBar from "$lib/components/TopBar.svelte";
    import { onMount } from "svelte";
    import {
        canUseSimulatedDate,
        getNow,
        getSimulatedDate,
        setSimulatedDate,
        resetSimulatedDate,
        toDateTimeLocalValue,
        fromDateTimeLocalValue,
    } from "$lib/simulateDate";

    let isAllowed = false;
    let inputValue = "";
    let currentEffectiveNow = "";
    let message = "";

    function refreshView() {
        const simulated = getSimulatedDate();
        inputValue = simulated ? toDateTimeLocalValue(simulated) : "";
        currentEffectiveNow = getNow().toString();
    }

    onMount(() => {
        isAllowed = canUseSimulatedDate();
        if (!isAllowed) return;
        refreshView();
    });

    function applySimulatedDate() {
        if (!isAllowed) return;
        const parsed = fromDateTimeLocalValue(inputValue);
        if (!parsed) {
            message = "Please enter a valid date/time.";
            return;
        }
        const ok = setSimulatedDate(parsed);
        message = ok ? "Simulated date updated." : "Failed to update simulated date.";
        refreshView();
    }

    function clearSimulatedDate() {
        if (!isAllowed) return;
        const ok = resetSimulatedDate();
        message = ok ? "Simulated date reset." : "Failed to reset simulated date.";
        refreshView();
    }
</script>

<TopBar title="Simulate Date"></TopBar>

<div class="container">
    {#if !isAllowed}
        <div class="notice">
            This page is only available on localhost.
        </div>
    {:else}
        <label for="simulate-date-input">Simulated date/time</label>
        <input
            id="simulate-date-input"
            type="datetime-local"
            bind:value={inputValue}
        />

        <div class="buttons">
            <button class="button" onclick={applySimulatedDate}>Apply</button>
            <button class="button reset" onclick={clearSimulatedDate}>Reset</button>
        </div>

        <div class="meta">
            <div><b>Effective now:</b> {currentEffectiveNow}</div>
            {#if message}
                <div class="message">{message}</div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .container {
        max-width: 720px;
        margin: 1rem auto;
        padding: 0 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .buttons {
        display: flex;
        gap: 0.5rem;
    }

    .reset {
        background: #e17d7d;
    }

    .notice {
        padding: 1rem;
        border-radius: 8px;
        background: #fff4db;
        border: 1px solid #f0cc83;
    }

    .meta {
        margin-top: 0.5rem;
        opacity: 0.85;
    }

    .message {
        margin-top: 0.5rem;
    }
</style>