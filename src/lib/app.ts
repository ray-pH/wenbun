import * as FSRS from "ts-fsrs"
import { dateDiffFormatted, getDaysSinceEpochLocal, getDeckFilename, loadDeck, type DeepRequired } from "./util"
import { BrowserIndexedDBStorage, type IStorage, TauriStorage } from "./storage";
import _ from "lodash";
import { ChineseToneColorPalette, DeckInfo, DEFAULT_FSRS_PARAM } from "./constants";
import { isTauri } from "@tauri-apps/api/core";
import { WebFileManager, type IFileManager } from "./fileManager";
import { ChineseMandarinReading } from "./chinese";
import { AppExtraStudyHandler } from "./appExtraStudyHandler";
const UNGROUPED_GROUP = "__ungrouped__"

const STORE_FILENAME = "profile.json"
const STORE_KEY_DECKS = "decks"
const STORE_KEY_DECK_DATA = "deckData"
const STORE_KEY_CONFIG = "config"
const STORE_KEY_REVIEW_LOGS = "reviewLogs"

const FSRS_GRADES: FSRS.Grade[] = [FSRS.Rating.Again, FSRS.Rating.Hard, FSRS.Rating.Good, FSRS.Rating.Easy];
export const DEFAULT_GROUP_CONTENT_COUNT = 30;

export enum WenBunCustomState {
    New = "New",
    Learning = "Learning",
    ReviewYoung = "Young",
    ReviewMature = "Mature",
    Relearning = "Relearning",
    PreviouslyStudied = "Previously Studied", // mark cards that are previously studied before this deck
    Ignored = "Ignored", // skip
}

export enum NewCardOrder {
    Mix = "Mix",
    AfterReviews = "After Reviews",
    BeforeReviews = "Before Reviews",
}

export enum ExtraStudyType {
    StudiedCards = "Studied Cards",
    HardCards = "Hard Cards",
    NewCards = "New Cards",
    YoungCards = "Young Cards",
    MatureCards = "Mature Cards",
    Group = "Group",
}
export interface ExtraStudyConfig {
    type: ExtraStudyType;
    count: number;
    group?: string; // for Group
}

export interface DeckData {
    deck: string[];
    tags: string[];
    previouslyStudied: number[]; // list of card ids that are marked as previously studied (i.e. previously studied before this deck)
    ignoredIds?: number[]; // list of card ids that are marked as ignored
    groups: Array<{ label: string, cardIds: number[] }>
    schedule: Record<number, FSRS.Card>
    // scheduled cards
    lastScheduleCheckDate: number;
    doneTodayNewCardCount: number;
    doneTodayPreviouslyStudiedCardCount: number;
    doneTodayReviewCount: number;
}

export interface WenbunConfig {
    // learning
    newCardPerDay?: number;
    maxReviewsPerDay?: number;
    newCardOrder?: NewCardOrder;
    newPreviouslyStudiedCardPerDay?: number;
    newPreviouslyStudiedCardOrder?: NewCardOrder;
    
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
        alwaysShowReading?: boolean;
        mandarinReading?: ChineseMandarinReading;
        playAudio?: boolean;
    }
}

const DEFAULT_CONFIG: DeepRequired<WenbunConfig> = {
    newCardPerDay: 5,
    maxReviewsPerDay: 200,
    newCardOrder: NewCardOrder.Mix,
    newPreviouslyStudiedCardPerDay: 20,
    newPreviouslyStudiedCardOrder: NewCardOrder.Mix,
    
    learningSteps: ["1m", "10m"],
    previouslyStudiedLearningSteps: ["1m", "5d"],
    desiredRetention: 0.9,
    enableShortTerm: true,
    enableFuzz: false,
    FSRSParams: DEFAULT_FSRS_PARAM,
    
    zh: {
        isColorBasedOnTone: true,
        toneColors: ChineseToneColorPalette.Default,
        alwaysShowReading: false,
        mandarinReading: ChineseMandarinReading.Pinyin,
        playAudio: true,
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
    fileManager: IFileManager;
    extraStudyHandler: AppExtraStudyHandler;

    constructor() {
        this.updateFSRS();
        if (isTauri()) {
            this.storage = new TauriStorage(STORE_FILENAME);
        } else {
            this.storage = new BrowserIndexedDBStorage(STORE_FILENAME);
        }
        this.fileManager = new WebFileManager();
        this.extraStudyHandler = new AppExtraStudyHandler(this);
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
    
    async init(): Promise<void> {
        await this.load();
        this.extraStudyHandler.init();
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
        const today = new Date();
        const todaysDate = getDaysSinceEpochLocal(today);
        for (const deckId of Object.keys(this.deckData)) {
            const deckData = this.deckData[deckId];
            const lastScheduleCheckDate = getDaysSinceEpochLocal(new Date(deckData.lastScheduleCheckDate));
            if (lastScheduleCheckDate < todaysDate) {
                // do the daily routine
                deckData.doneTodayNewCardCount = 0;
                deckData.doneTodayPreviouslyStudiedCardCount = 0;
                deckData.doneTodayReviewCount = 0;
                deckData.lastScheduleCheckDate = today.getTime();
            }
        }
        await this.save();
    }
    
    async getInitDeckData(deckId: string): Promise<DeckData | undefined> {
        const deckInfo = DeckInfo.find(d => d.id === deckId);
        const deck = await loadDeck(deckInfo?.src ?? `${deckId}.txt`);
        if (!deck) return undefined;
        return <DeckData>{
            deck,
            tags: deckInfo?.tags ?? [],
            groups: [
                { label: UNGROUPED_GROUP, cardIds: Array.from(deck.keys()) } // 0..(deck.length - 1)
            ],
            ignoredIds: [],
            previouslyStudied: [],
            schedule: {},
            lastScheduleCheckDate: new Date(0).getTime(),
            doneTodayNewCardCount: 0,
            doneTodayPreviouslyStudiedCardCount: 0,
            doneTodayReviewCount: 0,
        }
    }
    
    async addDeck(deckId: string): Promise<void> {
        if (!this.decks.includes(deckId)) {
            this.decks.push(deckId);
            await this.ensureDeckDataById(deckId);
            this.splitDeckIntoGroupOfN(deckId, DEFAULT_GROUP_CONTENT_COUNT)
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
        const card = this.getCard(deckId, cardId, true);
        if (!card) return;
        const isPreviouslyStudied = this.deckData[deckId]?.previouslyStudied?.includes(cardId);
        const fsrs = isPreviouslyStudied ? this.fsrsPrevStudied : this.fsrs;
        const schedulingCards = fsrs.repeat(card, date ?? new Date()) as FSRS.RecordLog;
        this.setCard(deckId, cardId, schedulingCards[grade].card);
        this.pushReviewLog(deckId, cardId, schedulingCards[grade].log);
        
        // if this is a previously studied card, remove it from the list and increase the count of done today previously studied cards by 1
        if (deckData.previouslyStudied.includes(cardId)) {
            //NOTE: after rating, the state will be set to learning
            deckData.previouslyStudied.splice(deckData.previouslyStudied.indexOf(cardId), 1);
            deckData.doneTodayPreviouslyStudiedCardCount++;
        }
        // if this is a new card, increase the count of done today new cards by 1
        else if (card.state === FSRS.State.New) {
            //NOTE: after rating, the state will be set to learning
            deckData.doneTodayNewCardCount++;
        }
        // normal review card
        else if (card.state === FSRS.State.Review) {
            //NOTE: if fail, the state will be set to relearning
            //      if success, the state will remain review but will have different due date
            //      so this is hopefully correct
            deckData.doneTodayReviewCount++;
        }
        // otherwise do nothing
    }
    
    getNextCard(deckId: string): number | undefined {
        
        if (this.extraStudyHandler.isExtraStudy()) {
            return this.extraStudyHandler.getNextCard();
        }
        
        // TODO: precalculate the next card on review
        const config = this.getConfig();
        
        const newCardCount = this.getScheduledNewCardsCount(deckId);
        const previouslyStudiedCardCount = this.getScheduledPreviouslyStudiedCardsCount(deckId);
        const todaysCardCount = this.getScheduledReviewCardsCount(deckId);
        
        const newCard = (newCardCount > 0) ? this.getNewCard(deckId) : undefined;
        const previouslyStudiedCards = (previouslyStudiedCardCount > 0) ? this.getPreviouslyStudiedCard(deckId) : undefined;
        const todaysCards = (todaysCardCount > 0) ? this.getTodaysScheduledCards(deckId)[0] : undefined;
        
        const head = [];
        const mid = [todaysCards];
        const tail = [];
        
        if (config.newCardOrder === NewCardOrder.BeforeReviews) head.push(newCard);
        if (config.newCardOrder === NewCardOrder.AfterReviews) tail.push(newCard);
        if (config.newPreviouslyStudiedCardOrder === NewCardOrder.BeforeReviews) head.push(previouslyStudiedCards);
        if (config.newPreviouslyStudiedCardOrder === NewCardOrder.AfterReviews) tail.push(previouslyStudiedCards);
        if (config.newCardOrder === NewCardOrder.Mix) {
            const prob = newCardCount / (newCardCount + todaysCardCount);
            if (Math.random() < prob) mid.unshift(newCard); else mid.push(newCard);
        }
        if (config.newPreviouslyStudiedCardOrder === NewCardOrder.Mix) {
            const prob = previouslyStudiedCardCount / (newCardCount + previouslyStudiedCardCount + todaysCardCount);
            if (Math.random() < prob) mid.unshift(previouslyStudiedCards); else mid.push(previouslyStudiedCards);
        }
        
        const arr = [...head, ...mid, ...tail];
        return arr.reduce((a, b) => a ?? b, undefined);
    }
    
    getNewCard(deckId: string): number {
        const deckData = this.deckData[deckId];
        const newCards = this.getNewCards(deckId);
        const id = newCards[0];
        return id;
    }
    
    getNewCards(deckId: string): number[] {
        const deckData = this.deckData[deckId];
        const groups = deckData.groups
        const cards = groups.flatMap((g) => g.cardIds);
        const newCards = cards.filter((id) => this.getWenbunCustomState(deckId, id) === WenBunCustomState.New);
        return newCards;
    }
    
    getPreviouslyStudiedCard(deckId: string): number | undefined {
        const deckData = this.deckData[deckId];
        return deckData?.previouslyStudied[0];
    }
    
    getNewCardsCount(deckId: string): number {
        return this.getNewCards(deckId).length;
    }
    getPreviouslyStudiedCardCount(deckId: string): number {
        return this.deckData[deckId]?.previouslyStudied.length ?? 0;
    }
    
    pushReviewLog(deckId: string, cardId: number, log: FSRS.ReviewLog): void {
        this.reviewLogs.push({deckId, cardId, log});
    }
    setCard(deckId: string, cardId: number, card: FSRS.Card): void {
        const deckData = this.deckData[deckId];
        if (!deckData) return;
        deckData.schedule[cardId] = card;
    }
    getCard(deckId: string, cardId: number, isCreateNewCardIfNeeded = false): FSRS.Card | undefined {
        const deckData = this.deckData[deckId];
        if (!deckData) return undefined;
        if (isCreateNewCardIfNeeded && deckData.schedule[cardId] === undefined) {
            return FSRS.createEmptyCard();
        }
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
        const card = this.getCard(deckId, cardId, true);
        let ratingScheduledTimeStr: Record<FSRS.Grade, string> = {1: '', 2: '', 3: '', 4: ''};
        
        if (!card) return ratingScheduledTimeStr;
        const isPreviouslyStudied = this.deckData[deckId]?.previouslyStudied?.includes(cardId);
        const fsrs = isPreviouslyStudied ? this.fsrsPrevStudied : this.fsrs;
        const schedulingCards = fsrs.repeat(card, new Date()) as FSRS.RecordLog;
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
        if (this.deckData[deckId]?.ignoredIds?.includes(cardId)) {
            return WenBunCustomState.Ignored;
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
    
    getTodaysReviewCards(deckId: string): number[] {
        const deckData = this.deckData[deckId];
        const todaysScheduledCards = this.getTodaysScheduledCards(deckId);
        const todaysReviewCards = todaysScheduledCards.filter((id) => deckData.schedule[id]?.state === FSRS.State.Review);
        return todaysReviewCards;
    }
    getScheduledReviewCardsCount(deckId: string): number {
        const deckData = this.deckData[deckId];
        const todaysReviewCards = this.getTodaysReviewCards(deckId);
        const config = this.getConfig();
        const count = Math.min(todaysReviewCards.length, config.maxReviewsPerDay - deckData.doneTodayReviewCount);
        return Math.max(0, count);
    }
    getScheduledNewCardsCount(deckId: string): number {
        const config = this.getConfig();
        const deckData = this.deckData[deckId];
        const count = Math.min(this.getNewCardsCount(deckId), config.newCardPerDay - deckData.doneTodayNewCardCount);
        return Math.max(0, count);
    }
    getScheduledPreviouslyStudiedCardsCount(deckId: string): number {
        const config = this.getConfig();
        const deckData = this.deckData[deckId];
        const count = Math.min(this.getPreviouslyStudiedCardCount(deckId), config.newPreviouslyStudiedCardPerDay - deckData.doneTodayPreviouslyStudiedCardCount);
        return Math.max(0, count);
    }
    getLearningRelearningCardsCount(deckId: string): number {
        const deckData = this.deckData[deckId];
        return Object.entries(deckData.schedule).filter(([id, s]) => 
            s.state === FSRS.State.Learning || s.state === FSRS.State.Relearning
        ).length;
    }
    
    addPreviouslyStudiedMark(deckId: string, cardId: number): void {
        const deckData = this.deckData[deckId];
        if (!deckData) return;
        if (deckData.previouslyStudied.includes(cardId)) return;
        const cardState = this.getWenbunCustomState(deckId, cardId);
        // you can only mark a new card as previously studied
        if (cardState !== WenBunCustomState.New) return;
        deckData.previouslyStudied.push(cardId);
    }
    removePreviouslyStudiedMark(deckId: string, cardId: number): void {
        const deckData = this.deckData[deckId];
        if (!deckData) return;
        const index = deckData.previouslyStudied.indexOf(cardId);
        if (index < 0) return;
        deckData.previouslyStudied.splice(index, 1);
    }
    
    ensureIgnoreIdArray(deckId: string): void {
        const deckData = this.deckData[deckId];
        if (!deckData) return;
        if (deckData.ignoredIds) return;
        deckData.ignoredIds = [];
    }
    addIgnoredMark(deckId: string, cardId: number): void {
        const deckData = this.deckData[deckId];
        if (!deckData) return;
        this.ensureIgnoreIdArray(deckId);
        if (deckData.ignoredIds?.includes(cardId)) return;
        deckData.ignoredIds?.push(cardId);
    }
    removeIgnoredMark(deckId: string, cardId: number): void {
        const deckData = this.deckData[deckId];
        if (!deckData) return;
        const index = deckData.ignoredIds?.indexOf(cardId);
        if (index == undefined || index < 0) return;
        deckData.ignoredIds?.splice(index, 1);
    }
    
    getTodaysScheduledCards(deckId: string): number[] {
        const deckData = this.deckData[deckId];
        if (!deckData) return [];
        const today = getDaysSinceEpochLocal(new Date());
        const tomorrow = today + 1;
        const todaysCards = Object.entries(deckData.schedule).filter(([id, s]) => {
            const isIgnored = !!deckData.ignoredIds?.includes(+id);
            const due = getDaysSinceEpochLocal(new Date(s.due));
            return due <= tomorrow && !isIgnored;
        });
        // TODO: for learning cards, use exact time; for review cards, use date
        // sort by time
        todaysCards.sort((a, b) => new Date(a[1].due).getTime() - new Date(b[1].due).getTime());
        return todaysCards.map((s) => +s[0]);
    }
    
    getChineseToneColor(tone?: number): string | undefined {
        if (!tone) return undefined;
        const config = this.getConfig();
        if (!config.zh.isColorBasedOnTone) return undefined;
        const colors = config.zh.toneColors;
        return colors[tone - 1];
    }
    
    splitDeckIntoGroupOfN(deckId: string, groupContentCount: number): void {
        const deckData = this.deckData[deckId];
        if (!deckData) return;
        const ids = Array.from(deckData.deck.keys())
        const groups: typeof deckData.groups = [];
        const groupCount = Math.ceil(ids.length / groupContentCount);
        for (let i = 0; i < groupCount; i++) {
            const groupId = `group-${i + 1}`;
            groups.push({ 
                label: groupId, 
                cardIds: ids.slice(i * groupContentCount, (i + 1) * groupContentCount) 
            });
        }
        deckData.groups = groups;
    }
    
    getGroupLabels(deckId: string): string[] {
        const deckData = this.deckData[deckId];
        if (!deckData) return [];
        return deckData.groups.map((g) => g.label);
    }
    
    getAllNonIgnoredIds(deckId: string): number[] {
        const deckData = this.deckData[deckId];
        if (!deckData) return [];
        const allIds = Array.from(deckData.deck.keys());
        return allIds.filter((id) => !deckData.ignoredIds?.includes(id));
    }
    
    async downloadProfile(): Promise<void> {
        const profileStr = this.exportProfile();
        const date = new Date().toLocaleDateString('en-CA');
        await this.fileManager.download({
            data: profileStr,
            filename: `wenbun-profile-${date}.txt`,
            mimeType: "text/plain",
        });
    }
    
    async tryUploadProfile(): Promise<boolean> {
        const payload = await this.fileManager.upload();
        if (payload === null) return false;
        if (typeof payload.data !== "string") return false;
        return this.tryImportProfile(payload.data);
    }
}