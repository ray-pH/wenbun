<script lang="ts">
    import { base } from '$app/paths';
    import TopBar from '../../lib/components/TopBar.svelte';
    import faqData from './faq.json';

    type FAQItem = {
        question: string;
        answer: string;
        answerHtml?: string;
        tags: string[];
        category: 'General' | 'Review' | 'Decks' | 'Account' | 'Troubleshooting' | 'SRS';
    };

    const faqItems = faqData as FAQItem[];

    // FAQ HTML is bundled application content; root-relative hrefs refer to app routes.
    function resolveAnswerLinks(html: string): string {
        return html.replace(/(\shref\s*=\s*)(["'])(\/(?!\/)[^"']*)\2/gi,
            (_match, attribute: string, quote: string, href: string) =>
                `${attribute}${quote}${base}${href}${quote}`);
    }

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
                        <p class="answer">{@html resolveAnswerLinks(item.answerHtml)}</p>
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
        background: var(--theme-faq-search-background, var(--theme-surface, #ffffff90));
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
        border: 1px solid var(--theme-faq-search-input-border, var(--theme-border, #00000030));
        border-radius: 0.6rem;
        padding: 0.65rem 0.75rem;
        font-size: 1rem;
    }

    .result-count {
        margin-top: 0.5rem;
        font-size: 0.9rem;
        color: var(--theme-faq-result-count, var(--theme-muted, #00000090));
    }

    .faq-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .faq-item {
        background: var(--theme-faq-item-background, var(--theme-surface, #ffffff90));
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
        color: var(--theme-faq-category-text, var(--theme-on-accent, #fff));
        border-radius: 999px;
        padding: 0.18rem 0.55rem;
        white-space: nowrap;
    }

    .answer {
        margin: 0.7rem 0 0 0;
        color: var(--theme-faq-answer-text, var(--theme-text, #000000dd));
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
        background: var(--theme-faq-empty-background, var(--theme-surface-alt, #00000010));
        border-radius: 0.75rem;
        padding: 1rem;
        text-align: center;
        color: var(--theme-faq-empty-text, var(--theme-muted, #000000a0));
    }
</style>