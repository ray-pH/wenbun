<script lang="ts">
    import TopBar from '$lib/components/TopBar.svelte';
    
    const communityMembers = [
        "Espartero", "jargansol", "Shika", "helixcatofen", "T",
        "AltiV", "eygy", "alpha_sneezer", "N", "Bowling",
        "PKdor", "grayroof66", "JacksonRiley", "jimmy_deep", "san",
    ]
</script>

<TopBar title="Credits"></TopBar>
<div class="main-container">
    <div class="credits-section">
        <h3>Code Contributors</h3>
        <div class="entry">
            pHoton
            <a href="https://github.com/ray-pH" target="_blank">
                <i class="fa-brands fa-github"></i>
                (ray-pH)
            </a>
        </div>
    </div>
    <div class="credits-section">
        <h3>Community Maintainer</h3>
        <div class="container">
            <div class="entry">Raz</div>
        </div>
    </div>
    <div class="credits-section">
        <h3>Community Member / Beta Tester</h3>
        <div class="container">
            {#each communityMembers as member}
                <div class="entry">{member}</div>
            {/each}
        </div>
        <p class="note">
            Big thanks to everyone in the community who shared feedback, suggestions, and bug reports during the early stages of Wenbun’s development.
        </p>
    </div>
    <!-- <div class="credits-section">
        <h3>Special Thanks</h3>
        <p>
            We would also like to extend our special thanks to the creators of the following open-source projects that Wenbun is built upon.
        </p>
    </div> -->
</div>

<style>
    .main-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
    }
    .credits-section {
        box-sizing: border-box;
        padding: 0 1em;
        max-width: 28em;
        margin-bottom: 1em;
    }
    h3 {
        font-size: 1.1em;
    }
    .container {
        display: flex;
        flex-direction: row;
        justify-content: center;
        flex-wrap: wrap;
        gap: 0.5em;
        row-gap: 0.5em;
    }
    .entry {
        background-color: #FFFFFF90;
        padding: 0.3em 0.8em;
        border-radius: 0.5rem;
    }
    .note {
        background-color: #00000050;
        padding: 2em;
        font-size: 0.9em;
        border-radius: 0.5rem;
        color: white;
    }
    a {
        color: var(--wenbun-blue);
    }
</style>
