<script lang="ts">
    import { get } from "svelte/store";
    import { profileStore } from "../../../stores/stores";

    export let data: {slug?: string};
    let deckId = data.slug || '';
    let profile = get(profileStore);
</script>


<div class="container">
</div>

<style>
</style>