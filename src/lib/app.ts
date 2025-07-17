import * as FSRS from "ts-fsrs"
import { dateDiffFormatted, loadDeck, type DeepRequired } from "./util"
import { type IStorage, TauriStorage } from "./storage";
import _ from "lodash";
import { ChineseToneColorPalette } from "./constants";
const UNGROUPED_GROUP = "__ungrouped__"

const STORE_FILENAME = "profile.json"
const STORE_KEY_DECKS = "decks"
const STORE_KEY_DECK_DATA = "deckData"

const FSRS_GRADES: FSRS.Grade[] = [FSRS.Rating.Again, FSRS.Rating.Hard, FSRS.Rating.Good, FSRS.Rating.Easy];

export enum WenBunCustomState {
    New = "New",
    Learning = "Learning",
    ReviewYoung = "Young",
    ReviewMature = "Mature",
    Relearning = "Relearning",
    PreviouslyStarted = "Previously Started", // mark cards that are already started learning before this deck
}

export interface DeckData {
    deck: string[];
    previouslyStarted: number[]; // list of card ids that are marked as previously started (i.e. already started learning before this deck)
    groups: Record<string, number[]>
    schedule: Record<number, FSRS.Card>
    scheduledNewCardCount: number
    lastScheduleCheckDate: number
}

export interface Config {
    scheduledNewCardCount?: number;
    // chinese
    zh: {
        isColorBasedOnTone?: boolean;
        toneColors?: string[];
    }
}

const DEFAULT_CONFIG: DeepRequired<Config> = {
    scheduledNewCardCount: 5,
    zh: {
        isColorBasedOnTone: true,
        // TODO: change 3rd color
        toneColors: ChineseToneColorPalette.Default,
    }
}

export class App {
    decks: string[] = [];
    deckData: Record<string, DeckData> = {};
    config: Config = DEFAULT_CONFIG;
    reviewLogs: {deckId: string, cardId: number, log: FSRS.ReviewLog}[] = [];
    isLoadDone = false;
    fsrs!: FSRS.FSRS;

    storage: IStorage;

    constructor() {
        this.updateFSRS();
        this.storage = new TauriStorage(STORE_FILENAME); // use tauri storage implementation for now
    }
    
    updateFSRS() {
        const params = FSRS.generatorParameters()
        this.fsrs = new FSRS.FSRS(params);
    }
    
    async init(debug = false): Promise<void> {
        if (debug) {
            await this.debug();
        } else {
            await this.load();
        }
        if (this.isNeedToProcessTodaySchedule()) {
            await this.processTodaySchedule();
        }
    }
    
    async debug() {
        this.decks = ['test'];
        this.deckData = {};
        await this.ensureDeckData();
        await this.save();
    }
    
    async load() {
        const [rawDecks, rawDeckData] = await Promise.all([
            this.storage.load<string[]>(STORE_KEY_DECKS),
            this.storage.load<Record<string, DeckData>>(STORE_KEY_DECK_DATA),
        ]);
        this.decks = rawDecks || [];
        this.deckData = rawDeckData || {};
        this.isLoadDone = true;
    }
    async save() {
        await Promise.all([
            this.storage.save(STORE_KEY_DECKS, this.decks),
            this.storage.save(STORE_KEY_DECK_DATA, this.deckData),
        ]);
    }
    
    isNeedToProcessTodaySchedule(): boolean {
        const today = new Date();
        for (const deckId of Object.keys(this.deckData)) {
            const deckData = this.deckData[deckId];
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
            previouslyStarted: [],
            schedule: {},
            scheduledNewCardCount: 0,
            lastScheduleCheckDate: new Date(0).getTime(),
        }
    }
    
    async addDeck(deckId: string): Promise<void> {
        if (!this.decks.includes(deckId)) {
            this.decks.push(deckId);
            await this.ensureDeckDataById(deckId);
            await this.save();
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
    
    getConfig(): DeepRequired<Config> {
        return _.merge({}, DEFAULT_CONFIG, this.config);
    }
    
    rateCard(deckId: string, cardId: number, grade: FSRS.Grade, date?: Date): void {
        const card = this.getCard(deckId, cardId);
        if (!card) return;
        const schedulingCards = this.fsrs.repeat(card, date ?? new Date()) as FSRS.RecordLog;
        this.setCard(deckId, cardId, schedulingCards[grade].card);
        this.pushReviewLog(deckId, cardId, schedulingCards[grade].log);
        // if this is a new card, reduce the count of scheduled new cards by 1
        if (card.state === 0) {
            this.deckData[deckId].scheduledNewCardCount--;
        }
    }
    
    getNextCard(deckId: string): number | undefined {
        // TODO: precalculate the next card on review
        // TODO: change new card position based on config
        if (this.deckData[deckId].scheduledNewCardCount > 0 && this.getNewCardsCount(deckId) > 0) {
            return this.getNewCard(deckId);
        } else {
            return this.getTodaysScheduledCards(deckId)[0];
        }
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
    
    getNewCardsCount(deckId: string): number {
        const deckData = this.deckData[deckId];
        const groups = deckData.groups;
        const cards = Object.values(groups).flat();
        const unusedCards = cards.filter((s) => !deckData.schedule[s])
        return unusedCards.length;
    }
    
    pushReviewLog(deckId: string, cardId: number, log: FSRS.ReviewLog): void {
        this.reviewLogs.push({deckId, cardId, log});
    }
    setCard(deckId: string, cardId: number, card: FSRS.Card): void {
        const deckData = this.deckData[deckId];
        if (!deckData) return;
        deckData.schedule[cardId] = card;
    }
    getCard(deckId: string, cardId: number): FSRS.Card | undefined {
        // TODO: better missing card handling
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
    getCardDue(deckId: string, cardId: number): Date | undefined {
        return this.getCard(deckId, cardId)?.due;
    }
    getCardDueFormatted(deckId: string, cardId: number): string {
        const due = this.getCardDue(deckId, cardId);
        if (!due) return 'Not Started';
        return dateDiffFormatted(new Date(), due);
    }
    getRatingScheduledTimeStr(deckId: string, cardId: number): Record<FSRS.Grade, string> {
        const card = this.getCard(deckId, cardId);
        let ratingScheduledTimeStr: Record<FSRS.Grade, string> = {1: '', 2: '', 3: '', 4: ''};
        
        if (!card) return ratingScheduledTimeStr;
        const schedulingCards = this.fsrs.repeat(card, new Date()) as FSRS.RecordLog;
        for (const grade of FSRS_GRADES) {
            const now = schedulingCards[grade].log.due;
            const due = schedulingCards[grade].card.due;
            ratingScheduledTimeStr[grade] = dateDiffFormatted(now, due);
        }
        return ratingScheduledTimeStr;
    }
    getWenbunCustomState(deckId: string, cardId: number): WenBunCustomState {
        if (this.deckData[deckId]?.previouslyStarted?.includes(cardId)) {
            return WenBunCustomState.PreviouslyStarted;
        }
        const card = this.getCard(deckId, cardId);
        switch (card?.state) {
            case FSRS.State.Learning: return WenBunCustomState.Learning;
            case FSRS.State.Review: {
                //TODO: get mature limit from config
                if (card.scheduled_days >= 21) return WenBunCustomState.ReviewMature;
                else return WenBunCustomState.ReviewYoung;
            }
            case FSRS.State.Relearning: return WenBunCustomState.Relearning;
            case FSRS.State.New:
            default: return WenBunCustomState.New;
        }
    }
    
    getTodaysScheduledCards(deckId: string): number[] {
        const deckData = this.deckData[deckId];
        if (!deckData) return [];
        const today = new Date();
        const todaysCards = Object.entries(deckData.schedule).filter(([id, s]) => 
            s.due.getDate() === today.getDate() || s.due.getDate() === today.getDate() + 1
        );
        // sort by time
        todaysCards.sort((a, b) => a[1].due.getTime() - b[1].due.getTime());
        return todaysCards.map((s) => +s[0]);
    }
    
    getChineseToneColor(tone?: number): string | undefined {
        if (!tone) return undefined;
        const config = this.getConfig();
        if (!config.zh.isColorBasedOnTone) return undefined;
        const colors = config.zh.toneColors;
        return colors[tone - 1];
    }
}