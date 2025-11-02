<script lang="ts">
    import { App, type ReviewLog } from "$lib/app";
    import Loading from "$lib/components/Loading.svelte";
    import { onMount } from "svelte";
    let app = new App();
    
    let deckId = "";
    let reviewLogStr: "";
    
    onMount(async () => {
        await app.init();
        app = app;
    });
    
    function simulate() {
        const reviewlogs = JSON.parse(reviewLogStr) as ReviewLog[] | {"review_log": ReviewLog}[];
        const count = reviewlogs.length;
        const done = new Set<string>();
        reviewlogs.forEach((l, i) => {
            let log: ReviewLog;
            if (l.hasOwnProperty("review_log")) {
                log = (l as any)["review_log"];
            } else {
                log = l as any;
            }
            if (log.deckId === deckId) {
                // avoid duplicate
                const key = `${log.cardId}-${log.log.state}-${log.log.review}-${log.log.rating}`
                if (!done.has(key)) {
                    app.debugSimulateRateCard(log.deckId, log.cardId, log.log.rating as any, new Date(log.log.review));
                    console.log(`simulated ${i + 1}/${count}}`);
                }
                done.add(key);
            }
        });
        app.save(true, true, false);
    }
</script>

<div>
    <div>
        deckId:
        <input type="text" bind:value={deckId}>
    </div>
    <div>
        reviewLog:
        <textarea bind:value={reviewLogStr}></textarea>
    </div>
    <button on:click={simulate}>simulate</button>
</div>
