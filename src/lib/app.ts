import * as FSRS from "ts-fsrs"
import { dateDiffFormatted, loadDeck, type DeepRequired } from "./util"
import { type IStorage, TauriStorage } from "./storage";
import _ from "lodash";
import { ChineseToneColorPalette, DEFAULT_FSRS_PARAM } from "./constants";
const UNGROUPED_GROUP = "__ungrouped__"

const STORE_FILENAME = "profile.json"
const STORE_KEY_DECKS = "decks"
const STORE_KEY_DECK_DATA = "deckData"
const STORE_KEY_CONFIG = "config"
const STORE_KEY_REVIEW_LOGS = "reviewLogs"

const FSRS_GRADES: FSRS.Grade[] = [FSRS.Rating.Again, FSRS.Rating.Hard, FSRS.Rating.Good, FSRS.Rating.Easy];

export enum WenBunCustomState {
    New = "New",
    Learning = "Learning",
    ReviewYoung = "Young",
    ReviewMature = "Mature",
    Relearning = "Relearning",
    PreviouslyStudied = "Previously Studied", // mark cards that are previously studied before this deck
}

export enum NewCardOrder {
    Mix = "Mix",
    AfterReviews = "After Reviews",
    BeforeReviews = "Before Reviews",
}

export interface DeckData {
    deck: string[];
    previouslyStudied: number[]; // list of card ids that are marked as previously studied (i.e. previously studied before this deck)
    groups: Record<string, number[]>
    schedule: Record<number, FSRS.Card>
    scheduledNewCardCount: number
    scheduledPreviouslyStudiedCardCount: number
    maxTodaysReviewCount: number
    lastScheduleCheckDate: number
}

export interface WenbunConfig {
    // learning
    newCardPerDay?: number;
    maxReviewsPerDay?: number; // TODO: current implementation is not fully correct
    newCardOrder?: NewCardOrder; //not implemented
    newPreviouslyStudiedCardPerDay?: number;
    newPreviouslyStudiedCardOrder?: NewCardOrder; //not implemented
    
    // FSRS
    learningSteps?: FSRS.Steps;
    previouslyStudiedLearningSteps?: FSRS.Steps;
    desiredRetention?: number;
    enableShortTerm?: boolean;
    enableFuzz?: boolean;
    FSRSParams?: number[];
    
    // chinese
    zh: {
        isColorBasedOnTone?: boolean;
        toneColors?: string[];
    }
}

const DEFAULT_CONFIG: DeepRequired<WenbunConfig> = {
    newCardPerDay: 5,
    maxReviewsPerDay: 200,
    newCardOrder: NewCardOrder.Mix,
    newPreviouslyStudiedCardPerDay: 20,
    newPreviouslyStudiedCardOrder: NewCardOrder.Mix,
    
    learningSteps: ["1m", "10m"],
    previouslyStudiedLearningSteps: ["5d", "15d"],
    desiredRetention: 0.9,
    enableShortTerm: true,
    enableFuzz: false,
    FSRSParams: DEFAULT_FSRS_PARAM,
    
    zh: {
        isColorBasedOnTone: true,
        toneColors: ChineseToneColorPalette.Default,
    },
}

type ReviewLog = {
    deckId: string;
    cardId: number;
    log: FSRS.ReviewLog;
}

export class App {
    decks: string[] = [];
    deckData: Record<string, DeckData> = {};
    config: WenbunConfig = DEFAULT_CONFIG;
    reviewLogs: ReviewLog[] = [];
    isLoadDone = false;
    fsrs!: FSRS.FSRS;
    fsrsPrevStudied!: FSRS.FSRS;

    storage: IStorage;

    constructor() {
        this.updateFSRS();
        this.storage = new TauriStorage(STORE_FILENAME); // use tauri storage implementation for now
    }
    
    updateFSRS() {
        const config = this.getConfig();
        const params = FSRS.generatorParameters({
            request_retention: config.desiredRetention,
            // maximum_interval: number;
            w: config.FSRSParams,
            enable_fuzz: config.enableFuzz,
            enable_short_term: config.enableShortTerm,
            learning_steps: config.learningSteps,
        })
        this.fsrs = new FSRS.FSRS(params);
        
        const prevStudiedParams = FSRS.generatorParameters({
            request_retention: config.desiredRetention,
            // maximum_interval: number;
            w: config.FSRSParams,
            enable_fuzz: config.enableFuzz,
            enable_short_term: config.enableShortTerm,
            learning_steps: config.previouslyStudiedLearningSteps,
        });
        this.fsrsPrevStudied = new FSRS.FSRS(prevStudiedParams);
    }
    
    async init(debug = false): Promise<void> {
        await this.load();
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
        const [decks, deckData, config, reviewLogs] = await Promise.all([
            this.storage.load<string[]>(STORE_KEY_DECKS),
            this.storage.load<Record<string, DeckData>>(STORE_KEY_DECK_DATA),
            this.storage.load<WenbunConfig>(STORE_KEY_CONFIG),
            this.storage.load<ReviewLog[]>(STORE_KEY_REVIEW_LOGS),
        ]);
        this.decks = decks || [];
        this.deckData = deckData || {};
        this.config = config || DEFAULT_CONFIG;
        this.reviewLogs = reviewLogs || [];
        this.isLoadDone = true;
    }
    async save() {
        await Promise.all([
            this.storage.save(STORE_KEY_DECKS, this.decks),
            this.storage.save(STORE_KEY_DECK_DATA, this.deckData),
            this.storage.save(STORE_KEY_CONFIG, this.config),
            this.storage.save(STORE_KEY_REVIEW_LOGS, this.reviewLogs),
        ]);
    }
    
    exportProfile(): string {
        const profileData = {
            config: this.config,
            decks: this.decks,
            deckData: this.deckData,
            reviewLogs: this.reviewLogs,
            meta: {
                _profileVersion: 1,
            }
        }
        return JSON.stringify(profileData);
    }
    async tryImportProfile(jsonStr: string): Promise<boolean> {
        // TODO: handle profile versioning
        // TODO: backup data
        // TODO: ensure structure
        try {
            const {config, decks, deckData, reviewLogs, meta} = JSON.parse(jsonStr);
            this.config = config;
            this.decks = decks;
            this.deckData = deckData;
            this.reviewLogs = reviewLogs;
            await this.save();
            return true;
        } catch (e) {
            return false;
        }
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
        const config = this.getConfig();
        const today = new Date();
        for (const deckId of Object.keys(this.deckData)) {
            const deckData = this.deckData[deckId];
            if (new Date(deckData.lastScheduleCheckDate).getDate() < today.getDate()) {
                // do the daily routine
                deckData.scheduledNewCardCount = config.newCardPerDay;
                deckData.scheduledPreviouslyStudiedCardCount = config.newPreviouslyStudiedCardPerDay;
                deckData.maxTodaysReviewCount = config.maxReviewsPerDay;
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
            previouslyStudied: [],
            schedule: {},
            scheduledNewCardCount: 0,
            scheduledPreviouslyStudiedCardCount: 0,
            maxTodaysReviewCount: 0,
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
    
    getConfig(): DeepRequired<WenbunConfig> {
        return _.merge({}, DEFAULT_CONFIG, this.config);
    }
    
    async saveConfig(config: WenbunConfig): Promise<void> {
        this.config = config;
        await this.save();
    }
    
    rateCard(deckId: string, cardId: number, grade: FSRS.Grade, date?: Date): void {
        const deckData = this.deckData[deckId];
        const card = this.getCard(deckId, cardId);
        if (!card) return;
        const schedulingCards = this.fsrs.repeat(card, date ?? new Date()) as FSRS.RecordLog;
        this.setCard(deckId, cardId, schedulingCards[grade].card);
        this.pushReviewLog(deckId, cardId, schedulingCards[grade].log);
        // if this is a new card, reduce the count of scheduled new cards by 1
        if (card.state === 0) {
            deckData.scheduledNewCardCount--;
        }
        // if this is a previously studied card, remove it from the list and reduce the count of scheduled previously studied cards by 1
        else if (deckData.previouslyStudied.includes(cardId)) {
            deckData.previouslyStudied.splice(deckData.previouslyStudied.indexOf(cardId), 1);
            deckData.scheduledPreviouslyStudiedCardCount--;
        }
        // normal review card
        else {
            // TODO: this is not fully correct
            deckData.maxTodaysReviewCount--;
        }
    }
    
    getNextCard(deckId: string): number | undefined {
        // TODO: precalculate the next card on review
        const deckData = this.deckData[deckId];
        const newCard = (deckData.scheduledNewCardCount > 0 && this.getNewCardsCount(deckId) > 0) 
            ? this.getNewCard(deckId) : undefined;
        const previouslyStudiedCards = (deckData.scheduledPreviouslyStudiedCardCount > 0 && this.getPreviouslyStutedCardsCount(deckId) > 0) 
            ? this.getPreviouslyStudiedCard(deckId) : undefined;
        const todaysCards = (deckData.maxTodaysReviewCount > 0)
            ? this.getTodaysScheduledCards(deckId)[0] : undefined;
        
        // TODO: change new card position based on config
        // currently, the order is: new card, previously studied card, today's card
        if (newCard) return newCard;
        if (previouslyStudiedCards) return previouslyStudiedCards;
        return todaysCards;
    }
    
    getNewCard(deckId: string): number {
        let deckData = this.deckData[deckId];
        let groups = deckData.groups
        let cards = Object.values(groups).flat();
        const unusedCards = cards.filter((s) => !deckData.schedule[s] || deckData.schedule[s].state === FSRS.State.New)
        let id = unusedCards[0];
        let card = FSRS.createEmptyCard();
        deckData.schedule[id] = card;
        return id;
    }
    
    getPreviouslyStudiedCard(deckId: string): number | undefined {
        const deckData = this.deckData[deckId];
        return deckData?.previouslyStudied[0];
    }
    
    getNewCardsCount(deckId: string): number {
        const deckData = this.deckData[deckId];
        const groups = deckData.groups;
        const cards = Object.values(groups).flat();
        const unusedCards = cards.filter((s) => !deckData.schedule[s])
        return unusedCards.length;
    }
    
    getPreviouslyStutedCardsCount(deckId: string): number {
        return this.deckData[deckId].previouslyStudied.length;
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
        return dateDiffFormatted(new Date(), new Date(due));
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
        if (this.deckData[deckId]?.previouslyStudied?.includes(cardId)) {
            return WenBunCustomState.PreviouslyStudied;
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