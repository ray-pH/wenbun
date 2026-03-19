<script lang="ts">
    import TopBar from "$lib/components/TopBar.svelte";
    import { base } from "$app/paths";
</script>

<TopBar title="Custom Deck Help"></TopBar>
<div class="container">
    <div class="help-content">
        <div class="section">
            <h3>General Information</h3>
            <p>
                When creating a custom deck, you only need to provide a list of Chinese words or characters. The application will automatically look up and generate the readings (like Pinyin) and meanings for you.
            </p>
            <p>
                After providing your word list, a preview will be shown. Some words may have warnings:
            </p>
            <ul>
                <li>
                    <i class="fa-solid fa-triangle-exclamation"></i> 
                    <b>Unsupported Character(s)</b>: This indicates that one or more characters in the word are not supported by the character writer for stroke practice. These words will be ignored during reviews that involve writing.
                </li>
                <li>
                    <i class="fa-solid fa-circle-exclamation"></i> 
                    <b>Not in Dictionary</b>: This means the word could not be found in the default dictionary.
                </li>
            </ul>
            <p>
                For words not found in the default dictionary, you can try enabling the <strong>extended dictionary (CC-CEDICT)</strong>. This may help find more obscure words. Please note that the initial loading of the extended dictionary may take a few moments.
            </p>
        </div>

        <h2>Custom Deck Input Format</h2>

        <p>You can import custom decks from text. There are three supported formats: Simple, CSV, and Anki Text.</p>
    
        <div class="section">
            <h3>Simple Format</h3>
            <p>This is the most basic format. Each line should contain a single word or character.</p>
            <p>Example:</p>
            <pre><code>你好
世界
学习
</code></pre>
            <p>Empty lines will be ignored.</p>
        </div>

        <div class="section">
            <h3>CSV (Comma-Separated Values)</h3>
            <p>This format is common for spreadsheet exports (Excel, Google Sheets). Fields are separated by commas, and values containing commas are usually enclosed in double quotes.</p>
            <p>You can choose to ignore the first line of the CSV if it contains headers (like "Word", "Pinyin", "Meaning").</p>
            <p>Example:</p>
            <pre><code>Word,Reading,Meaning
你好,nǐ hǎo,Hello
学习,xué xí,to study
</code></pre>
        </div>

        <div class="section">
            <h3>Anki Text / Tab-Separated Format</h3>
            <p>This format uses tabs to separate fields. It is a common export format from Anki and Pleco.</p>
            <p>Lines starting with <code>#</code> are treated as comments and will be ignored.</p>
            
            <p>Example:</p>
            <pre><code>你好	nǐ hǎo	Hello
学习	xué xí	to study
</code></pre>
            
            <h4>How to Export from Anki</h4>
            <p>To get a file in this format from the Anki desktop application:</p>
            <ol>
                <li>Choose the deck you wish to export.</li>
                <li>For the <b>'Export format'</b>, select <b>Notes in Plain Text</b>.</li>
                <li>It is recommended to disable the <b>'Include HTML and media references'</b> and <b>'Include tags'</b> options.</li>
                <li>Click <b>'Export'</b>.</li>
            </ol>

            <h4>How to Export from Pleco</h4>
            <p>To export your flashcards from the Pleco mobile app:</p>
            <ol>
                <li>Go to <b>Flashcards</b> -> <b>Import/Export</b> -> <b>Export Cards</b>.</li>
                <li>Keep the default settings (Text file, tab-separated).</li>
                <li>Once exported, you can upload the text file here.</li>
            </ol>
        </div>

        <div class="section">
            <h3>Advanced Options</h3>
            <p>When using CSV or Anki Text formats, you have several advanced options:</p>
            <ul>
                <li>
                    <i class="fa-solid fa-list-ol"></i>
                    <b>Column Index</b>: Specify which column (starting from 1) contains the words or characters.
                </li>
                <li>
                    <i class="fa-solid fa-file-import"></i>
                    <b>Import Reading/Meaning</b>: If your file already contains pronunciations or definitions, you can choose to import them instead of using the app's default dictionary. You must specify which column these fields are in.
                </li>
                <li>
                    <i class="fa-solid fa-filter"></i>
                    <b>Ignore Special Characters</b>: Automatically removes common punctuation marks (。？，) from the word column. This is useful if your word list contains full sentences or bracketed information.
                </li>
            </ul>

            <h4>Example Configuration</h4>
            <p>If you have a CSV file where the columns are mixed, like this:</p>
            <pre><code># Category,Definition,Word,Pinyin
Greeting,Hello,你好,nǐ hǎo
School,to study,学习,xué xí</code></pre>
            <p>To import this correctly, you would set:</p>
            <ul>
                <li>
                    <i class="fa-solid fa-list-ol"></i>
                    <b>Column Index</b>: 3 (for the word "你好")
                </li>
                <li>
                    <i class="fa-solid fa-file-import"></i>
                    <b>Meaning Column Index</b>: 2 (for the definition "Hello")
                </li>
                <li>
                    <i class="fa-solid fa-file-import"></i>
                    <b>Reading Column Index</b>: 4 (for the pinyin "nǐ hǎo")
                </li>
            </ul>
        </div>
    </div>
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin: 1em;
        padding-top: 1em;
    }
    .help-content {
        max-width: 32em;
    }
    pre {
        background-color: #f0f0f0;
        padding: 1em;
        border-radius: 0.3em;
        white-space: pre-wrap;
    }
    .section {
        padding-bottom: 1em;
        margin-bottom: 1em;
        border-bottom: 1px solid #ccc;
    }
    .section:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
    }
    ul, ol {
        padding-left: 1.2em;
    }
    ul {
        list-style: none;
        padding-left: 0;
    }
    li {
        margin-bottom: 0.5em;
    }
    i {
        margin-right: 0.5em;
    }
    .fa-triangle-exclamation {
        color: var(--wenbun-red);
    }
    .fa-circle-exclamation {
        color: var(--wenbun-orange);
    }
</style>