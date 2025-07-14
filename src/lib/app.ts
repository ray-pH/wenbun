import * as FSRS from "ts-fsrs"
import { loadDeck } from "./util"
import { load } from '@tauri-apps/plugin-store';
const UNGROUPED_GROUP = "__ungrouped__"

const STORE_FILENAME = "profile.json"
const STORE_KEY_DECKS = "decks"
const STORE_KEY_DECK_DATA = "deckData"


export interface DeckData {
    deck: string[];
    groups: Record<string, number[]>
    schedule: Record<number, FSRS.Card>
    scheduledNewCardCount: number
    lastScheduleCheckDate: number
}

export interface Config {
    scheduledNewCardCount: number;
}
const DEFAULT_CONFIG: Config = {
    scheduledNewCardCount: 5,
}

export class App {
    decks: string[] = [];
    deckData: Record<string, DeckData> = {};
    config: Config = DEFAULT_CONFIG;
    isLoadDone = false;
    
    constructor() {
    }
    
    async init(): Promise<void> {
        // await this.load();
        await this.debug();
        // console.log('hello', this.isNeedToProcessTodaySchedule());
        if (this.isNeedToProcessTodaySchedule()) {
            await this.processTodaySchedule();
        }
    }
    
    async debug() {
        if (true || this.decks.length === 0) {
            this.decks = ['old-hsk1']
            await this.ensureDeckData();
            await this.save();
        }
    }
    
    async load() {
        const store = await load(STORE_FILENAME, {autoSave: false});
        const decksPromise    = store.get(STORE_KEY_DECKS);
        const deckDataPromise = store.get(STORE_KEY_DECK_DATA);
        const [rawDecks, rawDeckData] = await Promise.all([decksPromise, deckDataPromise]) as any;
        this.decks = (await store.get(STORE_KEY_DECKS)) || [];
        this.deckData = (await store.get(STORE_KEY_DECK_DATA)) || {};
        this.decks    = rawDecks    || [];
        this.deckData = rawDeckData || {};
        this.isLoadDone = true;
    }
    async save() {
        const store = await load(STORE_FILENAME, {autoSave: false});
        await store.set(STORE_KEY_DECKS, this.decks);
        await store.set(STORE_KEY_DECK_DATA, this.deckData);
    }
    
    isNeedToProcessTodaySchedule(): boolean {
        const today = new Date();
        for (const deckId of Object.keys(this.deckData)) {
            const deckData = this.deckData[deckId];
            console.log({deckId, deckData})
            if (new Date(deckData.lastScheduleCheckDate).getDate() < today.getDate()) {
                return true;
            }
        }
        return false;
    }
    
    async processTodaySchedule(): Promise<void> {
        const today = new Date();
        for (const deckId of Object.keys(this.deckData)) {
            const deckData = this.deckData[deckId];
            if (new Date(deckData.lastScheduleCheckDate).getDate() < today.getDate()) {
                // do the daily routine
                deckData.scheduledNewCardCount = this.config.scheduledNewCardCount || DEFAULT_CONFIG.scheduledNewCardCount;
                deckData.lastScheduleCheckDate = today.getTime();
            }
        }
        await this.save();
    }
    
    async getInitDeckData(deckId: string): Promise<DeckData | undefined> {
        const deck = await loadDeck(deckId);
        if (!deck) return undefined;
        return <DeckData>{
            deck,
            groups: {
                [UNGROUPED_GROUP]: Array.from(deck.keys()) // 0..(deck.length - 1)
            },
            schedule: {},
            scheduledNewCardCount: 0,
            lastScheduleCheckDate: new Date(0).getTime(),
        }
    }
    
    async ensureDeckData(): Promise<void> {
        const promises = this.decks.map(async (deckId) => {
            await this.ensureDeckDataById(deckId);
        });
        await Promise.all(promises);
    }
    
    async ensureDeckDataById(deckId: string): Promise<void> {
        if (!this.deckData[deckId]) {
            const initDeckData = await this.getInitDeckData(deckId);
            if (!initDeckData) return Promise.reject(new Error("loading deck failed"))
            this.deckData[deckId] = initDeckData;
        }
    }
    
    getNextCard(deckId: string): number {
        // TODO: check schedule
        return this.getNewCard(deckId);
    }
    getNewCard(deckId: string): number {
        let deckData = this.deckData[deckId];
        let groups = deckData.groups
        let cards = Object.values(groups).flat();
        const unusedCards = cards.filter((s) => !deckData.schedule[s])
        let id = unusedCards[0];
        let card = FSRS.createEmptyCard();
        deckData.schedule[id] = card;
        return id;
    }
    
    getCard(deckId: string, cardId: number): FSRS.Card | undefined {
        const deckData = this.deckData[deckId];
        if (!deckData) return undefined;
        return deckData.schedule[cardId];
    }
    getCardWord(deckId: string, cardId: number): string {
        const deckData = this.deckData[deckId];
        if (!deckData) return '';
        const card = deckData.deck[cardId];
        if (!card) return '';
        return card;
    }
}