<script lang="ts">
    import TopBar from '$lib/components/TopBar.svelte';
    
    const communityMembers = [
        "Espartero", "jargansol", "Shika", "Chypriote", "helixcatofen", "T",
        "AltiV", "eygy", "alpha_sneezer", "N", "Bowling",
        "tonga000", "Jirun", "kuzicki", "haniku", "zoylentgreen", "CathB", "david", "Spider",
        "PKdor", "grayroof66", "JacksonRiley", "jimmy_deep", "san",
        "Yusuf Abdullah bin Adheem", "Maxim修朙", "319"
    ]
</script>

<TopBar title="Credits"></TopBar>
<div class="main-container">
    <div class="credits-section">
        <h3>Code Contributors</h3>
        <div class="container">
            <div class="entry">
                pHoton
                <a href="https://github.com/ray-pH" target="_blank">
                    <i class="fa-brands fa-github"></i>
                    (ray-pH)
                </a>
            </div>
            <div class="entry">
                sephirs
                <a href="https://github.com/llan" target="_blank">
                    <i class="fa-brands fa-github"></i>
                    (llan)
                </a>
            </div>
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
    <div class="sep"></div>
    <div class="credits-section">
        <h3>Projects</h3>
        <ul class="project-credits">
            <li><a href="https://hanziwriter.org/" target="_blank">hanzi-writer</a> — stroke animation and writing feedback</li>
            <li><a href="https://github.com/chanind/hanzi-writer-data" target="_blank">hanzi-writer-data</a> — Chinese stroke data</li>
            <li><a href="https://github.com/skishore/makemeahanzi" target="_blank">makemeahanzi</a> — Free, open-source Chinese character data</li>
            <li><a href="https://github.com/open-spaced-repetition" target="_blank">Open FSRS</a> — scheduling algorithm</li>
            <li><a href="https://github.com/drkameleon/complete-hsk-vocabulary" target="_blank">complete-hsk-vocabulary</a> — Chinese vocabulary data</li>
            
            <li><a href="https://github.com/nk2028/opencc-js" target="_blank">opencc-js</a> — Chinese character conversion</li>
            <li><a href="https://github.com/peterolson/pinyin-zhuyin" target="_blank">pinyin-zhuyin</a> — pinyin to zhuyin/bopomofo conversion</li>
            <li><a href="https://github.com/MacroYau/PyJyutping" target="_blank">PyJyutping</a> — Cantonese romanization conversion</li>
            <li><a href="https://github.com/hugolpz/audio-cmn" target="_blank">audio-cmn</a> — Mandarin pronounciation recording data</li>
            <li><a href="https://lingualibre.org/wiki/LinguaLibre:Main_Page" target="_blank">Lingua Libre</a> — Mandarin and Cantonese pronounciation recording data</li>
        </ul>
    </div>
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
    ul {
        list-style: none;
        padding: 0;
        text-align: left;
    }
    li {
        margin-bottom: 0.5em;
    }
    .sep {
        height: 1px;
        background-color: gray;
        width: 90vw;
        max-width: 28em;
        margin-top: 1em;
        margin-bottom: 1em;
    }
    .project-credits a {
        font-weight: bold;
    }
</style>