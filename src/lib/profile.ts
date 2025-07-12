import { get, type Writable } from "svelte/store"
import { loadDeck } from "./util"
const UNGROUPED_GROUP = "__ungrouped__"

export interface Profile {
    decks: string[]
    deckData: Record<string, DeckData>
}

export interface DeckData {
    groups: Record<string, string[]>
    scheduledNewCardCount: number
    lastNewCardCheckDate: Date
}

export class ProfileService {
    constructor(private profileStore: Writable<Profile>) {
    }
    
    processTodaySchedule(): void {
        const profile = get(this.profileStore);
        const today = new Date();
        for (const deckId of Object.keys(profile.deckData)) {
            const deckData = profile.deckData[deckId];
            if (deckData.lastNewCardCheckDate.getDate() < today.getDate()) {
                // do the daily routine
                deckData.scheduledNewCardCount = 5; // TODO: get from config
                deckData.lastNewCardCheckDate = today;
            }
        }
        this.profileStore.set(profile);
    }
    
    async ensureProfileDeckData(deckId: string): Promise<void> {
        const profile = get(this.profileStore);
        if (!profile.deckData[deckId]) {
            const initDeckData = await this.getInitDeckData(deckId);
            if (!initDeckData) return Promise.reject(new Error("loading deck failed"))
            profile.deckData[deckId] = initDeckData;
            this.profileStore.set(profile);
        }
    }
    
    async getInitDeckData(deckId: string): Promise<DeckData | undefined> {
        const deck = await loadDeck(deckId);
        if (!deck) return undefined;
        return <DeckData>{
            groups: {
                [UNGROUPED_GROUP]: deck
            },
            scheduledNewCardCount: 0,
            lastNewCardCheckDate: new Date(0),
        }
    }
}
