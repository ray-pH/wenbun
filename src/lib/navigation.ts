import { writable, derived, get } from 'svelte/store';
import { goto } from '$app/navigation';
import { base } from '$app/paths';

const history = writable<string[]>([]);

export const navigationHistory = {
    subscribe: history.subscribe,
    push: (path: string) => {
        const currentHistory = get(history);
        if (currentHistory[currentHistory.length - 1] !== path) {
            history.update(h => [...h, path]);
        }
    },
    back: (prohibitedBackUrl?: string) => {
        const currentHistory = get(history);
        if (currentHistory.length > 1) {
            // Pop current page from our history
            const newHistory = currentHistory.slice(0, -1);
            history.set(newHistory);
            
            // Get previous page
            const previousPage = newHistory[newHistory.length - 1];
            if (previousPage) {
                if (prohibitedBackUrl && new URL(previousPage, window.location.origin).pathname === prohibitedBackUrl) {
                    goto(base + '/');
                } else {
                    // Navigate back. replaceState is used to not create a new entry in the browser's history.
                    goto(previousPage, { replaceState: true });
                }
            }
        }
    },
    popWithoutGoingBack: () => {
        const currentHistory = get(history);
        if (currentHistory.length > 1) {
            // Pop current page from our history
            const newHistory = currentHistory.slice(0, -1);
            history.set(newHistory);
        }
    },
    goHomeAndClearHistory: () => {
        history.set([]);
        goto(base + '/');
    }
};

// A derived store to check if we can go back.
export const canGoBack = derived(history, $history => $history.length > 1);
