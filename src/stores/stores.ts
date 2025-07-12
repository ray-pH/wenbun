import { writable, type Writable } from 'svelte/store';
import type { Profile } from '../lib/profile';

export const profileStore: Writable<Profile> = writable({
    decks: [],
    deckData: {},
});