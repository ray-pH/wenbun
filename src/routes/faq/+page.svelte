<script lang="ts">
    import TopBar from '../../lib/components/TopBar.svelte';

    type FAQItem = {
        question: string;
        answer: string;
        answerHtml?: string;
        tags: string[];
        category: 'General' | 'Review' | 'Decks' | 'Account' | 'Troubleshooting' | 'SRS';
    };

    const faqItems: FAQItem[] = [
        {
            question: 'How do I start studying a deck?',
            answer: 'Go to Deck Browser, pick a deck, then open it and start a review session from the deck page.',
            tags: ['deck browser', 'study', 'start'],
            category: 'Decks'
        },
        {
            question: 'Can I upload my own deck?',
            answer: 'Yes. Use the Upload Custom Deck page to import your own words using supported formats like CSV or tab-separated text.',
            tags: ['custom deck', 'import', 'csv', 'anki'],
            category: 'Decks'
        },
        {
            question: 'What does "Previously Studied" mean?',
            answer: '"Previously Studied" is a pool for cards you already know from outside Wenbun. It helps you seed reviews faster without treating those cards as completely new.',
            tags: ['previously studied', 'known cards', 'seed', 'review'],
            category: 'Decks'
        },
        {
            question: 'How do I mark cards as Previously Studied?',
            answer: 'Open a deck, enter selection mode, select cards (or use "select all in this group"), then use "Mark as previously studied" from the action menu.',
            tags: ['mark as previously studied', 'select all', 'group', 'deck list'],
            category: 'Decks'
        },
        {
            question: 'How are Previously Studied cards scheduled each day?',
            answer: 'Daily intake and ordering are controlled by settings like New Previously Studied Card Per Day and New Previously Studied Card Order. You can also choose whether to draw from the back of the previously studied pool.',
            tags: ['newPreviouslyStudiedCardPerDay', 'order', 'start from back', 'settings'],
            category: 'SRS'
        },
        {
            question: 'What happens when I fail a card?',
            answer: 'The card scheduling is adjusted so it appears again sooner. Depending on your settings, reading hints may also be shown.',
            tags: ['grading', 'fail', 'schedule'],
            category: 'Review'
        },
        {
            question: 'Can I use Auto Next after a correct answer?',
            answer: 'Yes. Enable "Auto Next On Success" in Settings to automatically move on after correct answers. This option is disabled when grading is set to manual.',
            tags: ['auto next', 'correct answer', 'review flow', 'settings'],
            category: 'Review'
        },
        {
            question: 'Can I use keyboard shortcuts in review?',
            answer: 'Yes. You can configure keyboard behavior in Settings, including advancing to the next card.',
            tags: ['keyboard', 'shortcuts', 'settings'],
            category: 'Review'
        },
        {
            question: 'Can I practice writing on paper and grade manually?',
            answer: 'Yes. Set Writing Mode to External to write outside the app (for example on paper). In this mode, grading is manual so you can fully self-evaluate handwriting quality.',
            tags: ['external writing mode', 'manual grading', 'paper', 'handwriting'],
            category: 'Review'
        },
        {
            question: 'How does SRS work with Warm-up?',
            answer: 'Warm-up itself is not FSRS scheduling. During warm-up, a card is shown multiple times (typically 3 times). After warm-up, it is shown again on the next day by design, and then normal SRS scheduling begins.',
            tags: ['srs', 'warmup', 'fsrs', 'learning steps'],
            category: 'SRS'
        },
        {
            question: 'When does FSRS actually start for a new card?',
            answer: 'FSRS starts after the warm-up phase and the programmed next-day follow-up. From there, card intervals are calculated using the configured learning steps and retention settings.',
            tags: ['fsrs', 'start', 'new cards', 'intervals'],
            category: 'SRS'
        },
        {
            question: 'How do I sync my progress?',
            answer: 'Sign in to your account so your study data can be linked and synchronized across devices.',
            tags: ['sync', 'login', 'cloud'],
            category: 'Account'
        },
        {
            question: 'I cannot hear audio. What should I check?',
            answer: 'Check device volume, confirm audio is enabled in Settings, and verify audio source options in More Audio Settings.',
            tags: ['audio', 'sound', 'settings'],
            category: 'Troubleshooting'
        },
        {
            question: 'Why is a character not available for writing practice?',
            answer: 'Some characters may not have Hanzi Writer data. In those cases, writing practice may be limited for that entry.',
            tags: ['hanzi writer', 'unsupported', 'writing'],
            category: 'Troubleshooting'
        },
        {
            question: 'Where can I report bugs or suggest features?',
            answer: 'Report issues on Discord or on GitHub Issues. If it is breaking really bad, manually tag @pHoton in Discord so it gets seen quickly.',
            answerHtml: 'Report issues on <a href="https://discord.gg/pVUuqJqywt" target="_blank" rel="noopener noreferrer">Discord</a> or on <a href="https://github.com/ray-pH/wenbun/issues" target="_blank" rel="noopener noreferrer">GitHub Issues</a>. If it is breaking really bad, manually tag @pHoton in Discord so it gets seen quickly.',
            tags: ['bug report', 'feature request', 'discord', 'github', 'issues', '@pHoton', 'urgent'],
            category: 'General'
        }
    ];

    let searchQuery = '';

    $: normalizedQuery = searchQuery.trim().toLowerCase();
    $: filteredFaqItems =
        normalizedQuery.length === 0
            ? faqItems
            : faqItems.filter((item) =>
                  `${item.question} ${item.answer} ${item.tags.join(' ')} ${item.category}`
                      .toLowerCase()
                      .includes(normalizedQuery)
              );
</script>

<TopBar title="FAQ"></TopBar>

<div class="main-container">
    <div class="search-card">
        <label for="faq-search" class="search-label">Search FAQ</label>
        <input
            id="faq-search"
            class="search-input"
            type="search"
            placeholder="Search by question, topic, or keyword..."
            bind:value={searchQuery}
            autocomplete="off"
        />
        <div class="result-count">
            {filteredFaqItems.length} result{filteredFaqItems.length === 1 ? '' : 's'}
        </div>
    </div>

    {#if filteredFaqItems.length === 0}
        <div class="empty-state">
            No FAQ matched “{searchQuery}”.
        </div>
    {:else}
        <div class="faq-list">
            {#each filteredFaqItems as item (item.question)}
                <details class="faq-item">
                    <summary>
                        <span class="question">{item.question}</span>
                        <span class="category">{item.category}</span>
                    </summary>
                    {#if item.answerHtml}
                        <p class="answer">{@html item.answerHtml}</p>
                    {:else}
                        <p class="answer">{item.answer}</p>
                    {/if}
                </details>
            {/each}
        </div>
    {/if}
</div>

<style>
    .main-container {
        max-width: 52rem;
        margin: 0 auto;
        padding: 0.75rem 1rem 2rem 1rem;
        box-sizing: border-box;
    }

    .search-card {
        background: #ffffff90;
        border-radius: 0.75rem;
        padding: 0.9rem;
        margin-bottom: 1rem;
    }

    .search-label {
        display: block;
        font-weight: 700;
        margin-bottom: 0.4rem;
    }

    .search-input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #00000030;
        border-radius: 0.6rem;
        padding: 0.65rem 0.75rem;
        font-size: 1rem;
    }

    .result-count {
        margin-top: 0.5rem;
        font-size: 0.9rem;
        color: #00000090;
    }

    .faq-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .faq-item {
        background: #ffffff90;
        border-radius: 0.75rem;
        padding: 0.75rem 0.9rem;
    }

    .faq-item summary {
        cursor: pointer;
        list-style: none;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 0.8rem;
    }

    .faq-item summary::-webkit-details-marker {
        display: none;
    }

    .question {
        font-weight: 700;
    }

    .category {
        font-size: 0.75rem;
        background: #3a73c5;
        color: #fff;
        border-radius: 999px;
        padding: 0.18rem 0.55rem;
        white-space: nowrap;
    }

    .answer {
        margin: 0.7rem 0 0 0;
        color: #000000dd;
        line-height: 1.45;
    }

    .answer :global(a) {
        color: var(--wenbun-blue);
        font-weight: 700;
        text-decoration: underline;
        text-underline-offset: 0.12em;
    }

    .answer :global(a:hover) {
        filter: brightness(0.9);
    }

    .empty-state {
        background: #00000010;
        border-radius: 0.75rem;
        padding: 1rem;
        text-align: center;
        color: #000000a0;
    }
</style>