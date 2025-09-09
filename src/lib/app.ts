import * as FSRS from "ts-fsrs"
import { dateDiffFormatted, generateRandomString, getDaysSinceEpochLocal, getDeckFilename, loadDeck, semverBiggerThan, type DeepRequired } from "./util"
import { BrowserIndexedDBStorage, type IStorage, TauriStorage } from "./storage";
import _ from "lodash";
import { ChineseToneColorPalette, DECK_TAGS, DeckInfo, DEFAULT_FSRS_PARAM } from "./constants";
import { isTauri } from "@tauri-apps/api/core";
import { WebFileManager, type IFileManager } from "./fileManager";
import { ChineseMandarinReading } from "./chinese";
import { AppExtraStudyHandler } from "./appExtraStudyHandler";
import { Profile, SyncConflicAutoResolve } from "./profile";
declare const __APP_VERSION__: string; // injected by vite
const UNGROUPED_GROUP = "__ungrouped__"

const STORE_FILENAME = "profile.json"
const STORE_KEY_DECKS = "decks"
const STORE_KEY_DECK_DATA = "deckData"
const STORE_KEY_CONFIG = "config"
const STORE_KEY_REVIEW_LOGS = "reviewLogs"
const STORE_KEY_AUTO_REVIEW_GRADE_LOG = "autoReviewGradeLog"
const STORE_KEY_META = "meta"
const STORE_KEY_LAST_SYNC_TIME = "lastSyncTime"

// simple configs, store in local storage
const LOCALSTORAGE_KEY_STROKE_SPEED = "strokeSpeed" 

const FSRS_GRADES: FSRS.Grade[] = [FSRS.Rating.Again, FSRS.Rating.Hard, FSRS.Rating.Good, FSRS.Rating.Easy];
export const DEFAULT_GROUP_CONTENT_COUNT = 30;
const DEFAULT_WARMUP_MAX_COUNT = 3;
const GENERATED_DECK_ID_LENGTH = 8;

export enum WenBunCustomState {
    New = "New",
    WarmUp = "WarmUp",
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
    label?: string;
    deck: string[];
    tags: string[];
    previouslyStudied: number[]; // list of card ids that are marked as previously studied (i.e. previously studied before this deck)
    ignoredIds?: number[]; // list of card ids that are marked as ignored
    warmUpIds?: Record<number, number>; // <id, count>
    groups: Array<{ label: string, cardIds: number[] }>
    schedule: Record<number, FSRS.Card>
    // scheduled cards
    lastScheduleCheckDate: number;
    doneTodayNewCardCount: number;
    doneTodayPreviouslyStudiedCardCount: number;
    doneTodayReviewCount: number;
    // custom entry
    customEntry?: Record<number, {r?: string, m?: string}> // reading and meaning
}

export interface WenbunConfig {
    // learning
    newCardPerDay?: number;
    maxReviewsPerDay?: number;
    newCardOrder?: NewCardOrder;
    newPreviouslyStudiedCardPerDay?: number;
    newPreviouslyStudiedCardOrder?: NewCardOrder;
    gradeWarmUpCards?: boolean;
    startPreviouslyStudiedCardFromTheBack?: boolean;
    
    // UI
    uiScale?: 'small' | 'normal' | 'custom'; // 10px, 16px
    customFontSize?: number;
    
    // Review
    gradingMethod?: 'auto' | 'manual';
    strokeLeniency?: number;
    showAutoGradingBar?: boolean;
    
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
    startPreviouslyStudiedCardFromTheBack: true,
    gradeWarmUpCards: false,
    
    uiScale: 'normal',
    customFontSize: 16,
    
    gradingMethod: 'auto',
    strokeLeniency: 1.5,
    showAutoGradingBar: false,
    
    learningSteps: ["1m", "10m"],
    previouslyStudiedLearningSteps: ["1m", "5d"],
    desiredRetention: 0.9,
    enableShortTerm: false,
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

export type ReviewLog = {
    deckId: string;
    cardId: number;
    log: FSRS.ReviewLog;
}

type AutoReviewGradeLog = {
    correctCount: number;
    mistakeCount: number;
    grade: FSRS.Grade;
}

export interface ProfileDataMeta {
    _profileVersion?: number,
    clientVersion?: string, // semver
    modifiedAt?: string,
}

export interface ProfileData {
    config: WenbunConfig,
    decks: string[],
    deckData: Record<string, DeckData>,
    reviewLogs: ReviewLog[],
    meta: ProfileDataMeta,
}

export enum DeckView {
    Normal = "Normal",
    Small = "Small",
    Table = "Table",
    TableEdit = "TableEdit",
}

export class App {
    decks: string[] = [];
    deckData: Record<string, DeckData> = {};
    config: WenbunConfig = DEFAULT_CONFIG;
    reviewLogs: ReviewLog[] = [];
    autoReviewGradeLog: AutoReviewGradeLog[] = [];
    meta: ProfileDataMeta = {};
    lastSyncTime: string = new Date(0).toISOString();
    isLoadDone = false;
    fsrs!: FSRS.FSRS;
    fsrsPrevStudied!: FSRS.FSRS;

    storage: IStorage;
    fileManager: IFileManager;
    extraStudyHandler: AppExtraStudyHandler;
    
    public profile: Profile;

    constructor() {
        this.updateFSRS();
        if (isTauri()) {
            this.storage = new TauriStorage(STORE_FILENAME);
        } else {
            this.storage = new BrowserIndexedDBStorage(STORE_FILENAME);
        }
        this.fileManager = new WebFileManager();
        this.extraStudyHandler = new AppExtraStudyHandler(this);
        this.profile = new Profile(this.storage);
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
        this.updateFontSize();
        this.extraStudyHandler.init();
        await this.afterInitRoutine();
    }
    
    async afterInitRoutine(): Promise<void> {
        this.updateFSRS();
        await this.processTodaySchedule();
    }
    
    /**
     * @returns boolean: `true` if data changed
     */
    async initProfile(): Promise<boolean> {
        await this.profile.init();
        if (this.profile.isLoggedIn) {
            const strategy = isTauri() ? SyncConflicAutoResolve.ask : SyncConflicAutoResolve.normalPull;
            const changed = await this.profile.trySyncProfile(this, strategy);
            if (changed) await this.afterInitRoutine();
            return changed;
        } else {
            return false;
        }
    }
    
    async debug() {
        this.decks = ['test'];
        this.deckData = {};
        this.reviewLogs = [];
        this.config = DEFAULT_CONFIG;
        await this.save();
    }
    
    debugSimulate() {
        let card = FSRS.createEmptyCard();
        const fsrs = this.fsrs;
        
        const rateAndPrintDues = (grade: FSRS.Grade) => {
            const schedule = fsrs.repeat(card, card.due) as FSRS.RecordLog;
            let ratingScheduledTimeStr: Record<FSRS.Grade, any> = {1: '', 2: '', 3: '', 4: ''};
            for (const grade of FSRS_GRADES) {
                const now = schedule[grade].log.review;
                const due = schedule[grade].card.due;
                ratingScheduledTimeStr[grade] = dateDiffFormatted(now, due);
            }
            console.log(grade, ratingScheduledTimeStr);
            card = schedule[grade].card;
        };
        
        rateAndPrintDues(FSRS.Rating.Again);
        rateAndPrintDues(FSRS.Rating.Again);
        rateAndPrintDues(FSRS.Rating.Good);
        rateAndPrintDues(FSRS.Rating.Good);
        rateAndPrintDues(FSRS.Rating.Good);
        rateAndPrintDues(FSRS.Rating.Again);
    }
    
    updateFontSize() {
        const fontSize = `${this.getFontSizePx()}px`;
        document.body.style.fontSize = fontSize;
    }
    getCurrentUIScale(): number {
        return this.getFontSizePx() / 16;
    }
    getFontSizePx(): number {
        const config = this.getConfig();
        switch (config.uiScale) {
            case 'small': return 10;
            case 'normal': return 16;
            case 'custom': return _.clamp(config.customFontSize, 8, 32);
        }
    }
    
    async load() {
        const [decks, deckData, config, reviewLogs, autoReviewGradeLog, meta, lastSyncTime] = await Promise.all([
            this.storage.load<string[]>(STORE_KEY_DECKS),
            this.storage.load<Record<string, DeckData>>(STORE_KEY_DECK_DATA),
            this.storage.load<WenbunConfig>(STORE_KEY_CONFIG),
            this.storage.load<ReviewLog[]>(STORE_KEY_REVIEW_LOGS),
            this.storage.load<AutoReviewGradeLog[]>(STORE_KEY_AUTO_REVIEW_GRADE_LOG),
            this.storage.load<ProfileDataMeta>(STORE_KEY_META),
            this.storage.load<string>(STORE_KEY_LAST_SYNC_TIME),
        ]);
        this.decks = decks || [];
        this.deckData = deckData || {};
        this.config = config || DEFAULT_CONFIG;
        this.reviewLogs = reviewLogs || [];
        this.autoReviewGradeLog = autoReviewGradeLog || [];
        this.meta = meta || {clientVersion: __APP_VERSION__};
        this.lastSyncTime = lastSyncTime || new Date(0).toISOString();
        this.isLoadDone = true;
    }
    async save(skipSync = false, awaitSync = false, updateMetaClientVersion = true) {
        const isChanged = await this.isDataChanged();
        if (!isChanged) return;
        
        this.updateFontSize();
        this.meta.modifiedAt = new Date().toISOString();
        this.meta._profileVersion = 1;
        if (updateMetaClientVersion) this.meta.clientVersion = __APP_VERSION__;
        await Promise.all([
            this.storage.save(STORE_KEY_DECKS, this.decks),
            this.storage.save(STORE_KEY_DECK_DATA, this.deckData),
            this.storage.save(STORE_KEY_CONFIG, this.config),
            this.storage.save(STORE_KEY_REVIEW_LOGS, this.reviewLogs),
            this.storage.save(STORE_KEY_AUTO_REVIEW_GRADE_LOG, this.autoReviewGradeLog),
            this.storage.save(STORE_KEY_META, this.meta),
            this.storage.save(STORE_KEY_LAST_SYNC_TIME, this.lastSyncTime),
        ]);
        if (!skipSync) {
            const strategy = isTauri() ? SyncConflicAutoResolve.ask : SyncConflicAutoResolve.normalPush;
            if (awaitSync) await this.profile.trySyncProfile(this, strategy);
            else this.profile.trySyncProfile(this, strategy).catch(console.error);
        }
    }
    async updateLastSyncTime(time = new Date()) {
        this.lastSyncTime = time.toISOString();
        await this.storage.save(STORE_KEY_LAST_SYNC_TIME, this.lastSyncTime);
    }
    
    async isDataChanged(): Promise<boolean> {
        const [decks, deckData, config, reviewLogs, autoReviewGradeLog] = await Promise.all([
            this.storage.load<string[]>(STORE_KEY_DECKS),
            this.storage.load<Record<string, DeckData>>(STORE_KEY_DECK_DATA),
            this.storage.load<WenbunConfig>(STORE_KEY_CONFIG),
            this.storage.load<ReviewLog[]>(STORE_KEY_REVIEW_LOGS),
            this.storage.load<AutoReviewGradeLog[]>(STORE_KEY_AUTO_REVIEW_GRADE_LOG),
        ]);
        return !_.isEqual(this.decks, decks) ||
            !_.isEqual(this.deckData, deckData) ||
            !_.isEqual(this.config, config) ||
            !_.isEqual(this.reviewLogs, reviewLogs) ||
            !_.isEqual(this.autoReviewGradeLog, autoReviewGradeLog);
    }
    
    exportProfileStr(includeReviewLogs = true): string {
        return JSON.stringify(this.exportProfile(includeReviewLogs));
    }
    async tryImportProfileStr(jsonStr: string, includeReviewLogs = true): Promise<boolean> {
        try {
            const parsed = JSON.parse(jsonStr);
            return this.tryImportProfile(parsed, includeReviewLogs);
        } catch (e) {
            return false;
        }
    }
    exportProfile(includeReviewLogs = true): ProfileData {
        return {
            config: this.config,
            decks: this.decks,
            deckData: this.deckData,
            reviewLogs: includeReviewLogs ? this.reviewLogs : [],
            meta: this.meta
        }
    }
    async tryImportProfile(profileData: any, includeReviewLogs = true, skipSync = false): Promise<boolean> {
        // TODO: handle profile versioning
        // TODO: backup data
        // TODO: ensure structure
        try {
            const {config, decks, deckData, reviewLogs, meta} = profileData;
            this.config = config;
            this.decks = decks;
            this.deckData = deckData;
            if (includeReviewLogs) {
                this.reviewLogs = reviewLogs;
            }
            this.meta = meta;
            await this.save(skipSync, undefined, false);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    async processTodaySchedule(): Promise<void> {
        const today = new Date();
        const todaysDate = getDaysSinceEpochLocal(today);
        let changed = false;
        for (const deckId of Object.keys(this.deckData)) {
            const deckData = this.deckData[deckId];
            const lastScheduleCheckDate = getDaysSinceEpochLocal(new Date(deckData.lastScheduleCheckDate));
            if (lastScheduleCheckDate < todaysDate) {
                // do the daily routine
                deckData.doneTodayNewCardCount = 0;
                deckData.doneTodayPreviouslyStudiedCardCount = 0;
                deckData.doneTodayReviewCount = 0;
                deckData.lastScheduleCheckDate = today.getTime();
                changed = true;
            }
        }
        if (changed) await this.save();
    }
    
    async getInitDeckDataById(deckId: string): Promise<DeckData | undefined> {
        const deckInfo = DeckInfo.find(d => d.id === deckId);
        const deck = await loadDeck(deckInfo?.src ?? `${deckId}.txt`);
        if (!deck) return undefined;
        return this.getInitDeckData(deck, deckInfo?.tags ?? []);
    }
    
    getInitDeckData(words: string[], tags: DECK_TAGS[]): DeckData {
        const deckData: DeckData = {
            deck: words,
            tags,
            groups: [
                { label: UNGROUPED_GROUP, cardIds: Array.from(words.keys()) } // 0..(deck.length - 1)
            ],
            ignoredIds: [],
            previouslyStudied: [],
            schedule: {},
            lastScheduleCheckDate: new Date(0).getTime(),
            doneTodayNewCardCount: 0,
            doneTodayPreviouslyStudiedCardCount: 0,
            doneTodayReviewCount: 0,
        }
        return deckData;
    }
    
    async addDeckById(deckId: string): Promise<void> {
        const deckData = await this.getInitDeckDataById(deckId);
        if (!deckData) return Promise.reject(new Error("loading deck failed"))
        await this.addDeck(deckId, deckData);
    }
    
    async addDeck(deckLabel: string, deckData: DeckData): Promise<void> {
        const deckId = this.generateNewDeckId();
        deckData.label = deckLabel;
        this.deckData[deckId] = deckData;
        if (this.decks.includes(deckId)) return;
        this.decks.push(deckId);
        this.splitDeckIntoGroupOfN(deckId, DEFAULT_GROUP_CONTENT_COUNT)
        await this.save();
    }
    
    async deleteDeck(deckId: string, confirmed = false): Promise<void> {
        // confirmed optional parameter added as safety measure
        if (!confirmed) return;
        if (this.decks.includes(deckId)) {
            this.decks = this.decks.filter(d => d != deckId);
        }
        delete this.deckData[deckId];
    }
    
    generateNewDeckId(): string {
        let id: string;
        do {
            id = generateRandomString(GENERATED_DECK_ID_LENGTH);
        } while (this.decks.includes(id));
        return id;
    }
    
    getConfig(): DeepRequired<WenbunConfig> {
        return _.merge({}, DEFAULT_CONFIG, this.config);
    }
    
    async resetConfigToDefault(): Promise<void> {
        this.config = _.cloneDeep(DEFAULT_CONFIG);
        await this.save();
    }
    
    async saveConfig(config: WenbunConfig): Promise<void> {
        this.config = config;
        await this.save();
    }
    
    rateCard(deckId: string, cardId: number, grade: FSRS.Grade, date?: Date): void {
        // if card is rated, remove from warm up
        this.stopWarmUp(deckId, cardId);
        
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
    
    warmUpNext(deckId: string, cardId: number): void {
        const deckData = this.deckData[deckId];
        if (!deckData) return;
        if (deckData.warmUpIds?.[cardId] !== undefined) {
            deckData.warmUpIds[cardId]++;
        }
        // the handling of when the warm up is complete is done in the review component
    }
    
    getNextCard(deckId: string): number | undefined {
        
        if (this.extraStudyHandler.isExtraStudy()) {
            return this.extraStudyHandler.getNextCard();
        }
        
        // TODO: precalculate the next card on review
        const config = this.getConfig();
        
        const newOrWarmUpCardCount = this.getScheduledNewOrWarmUpCardsCount(deckId);
        const previouslyStudiedCardCount = this.getScheduledPreviouslyStudiedCardsCount(deckId);
        const todaysCardCount = this.getScheduledReviewCardsCount(deckId);
        
        // need this for accurate mixing ratio
        const totalNewOrWarmUpCardCount = this.getTotalScheduledNewOrWarmUpTotalCount(deckId);
        
        const newOrWarmUp = (newOrWarmUpCardCount > 0) ? this.getNewOrWarmUpCard(deckId) : undefined;
        const previouslyStudiedCards = (previouslyStudiedCardCount > 0) ? this.getPreviouslyStudiedCard(deckId) : undefined;
        const todaysCards = (todaysCardCount > 0) ? this.getTodaysScheduledCards(deckId)[0] : undefined;
        
        const head = [];
        const mid = [todaysCards];
        const tail = [];
        
        if (config.newCardOrder === NewCardOrder.BeforeReviews) head.push(newOrWarmUp);
        if (config.newCardOrder === NewCardOrder.AfterReviews) tail.push(newOrWarmUp);
        if (config.newPreviouslyStudiedCardOrder === NewCardOrder.BeforeReviews) head.push(previouslyStudiedCards);
        if (config.newPreviouslyStudiedCardOrder === NewCardOrder.AfterReviews) tail.push(previouslyStudiedCards);
        if (config.newCardOrder === NewCardOrder.Mix) {
            const prob = totalNewOrWarmUpCardCount / (totalNewOrWarmUpCardCount + todaysCardCount);
            if (Math.random() < prob) mid.unshift(newOrWarmUp); else mid.push(newOrWarmUp);
        }
        if (config.newPreviouslyStudiedCardOrder === NewCardOrder.Mix) {
            const prob = previouslyStudiedCardCount / (totalNewOrWarmUpCardCount + previouslyStudiedCardCount + todaysCardCount);
            if (Math.random() < prob) mid.unshift(previouslyStudiedCards); else mid.push(previouslyStudiedCards);
        }
        
        const arr = [...head, ...mid, ...tail];
        return arr.reduce((a, b) => a ?? b, undefined);
    }
    
    skipWarmUp(deckId: string, cardId: number): void {
        const deckData = this.deckData[deckId];
        if (!deckData) return;
        this.startWarmUp(deckId, cardId);
        deckData.warmUpIds![cardId] = DEFAULT_WARMUP_MAX_COUNT;
    }
    startWarmUp(deckId: string, cardId: number): void {
        const deckData = this.deckData[deckId];
        if (!deckData) return;
        if (deckData.warmUpIds === undefined) deckData.warmUpIds = {};
        deckData.warmUpIds[cardId] = 0;
    }
    stopWarmUp(deckId: string, cardId: number): void {
        const warmUpIds = this.deckData[deckId]?.warmUpIds;
        if (!warmUpIds) return;
        delete warmUpIds[cardId];
    }
    
    getWarmUpCount(deckId: string, cardId: number): number | undefined {
        return this.deckData[deckId]?.warmUpIds?.[cardId];
    }
    getMaxWarmUpCount(): number {
        return DEFAULT_WARMUP_MAX_COUNT;
    }
    isWarmUpCard(deckId: string, cardId: number): boolean {
        return this.getWarmUpCount(deckId, cardId) !== undefined;
    }
    
    getNewOrWarmUpCard(deckId: string): number | undefined {
        const scheduledNewOrWarmUpCardsCount = this.getScheduledNewOrWarmUpCardsCount(deckId);
        const scheduledNewCardsCount = scheduledNewOrWarmUpCardsCount - this.getWarmUpCardsCount(deckId);
        
        const newCard = this.getNewCard(deckId);
        const deckData = this.deckData[deckId];
        if (!deckData.warmUpIds) return newCard;
        
        // randomly pick a warm up card
        const warmUpIds = Object.keys(deckData.warmUpIds);
        const warmUpId = +warmUpIds[Math.floor(Math.random() * warmUpIds.length)];
        
        // if scheduled new cards count is 0, return the warm up card
        if (scheduledNewCardsCount <= 0) {
            return warmUpId;
        }
        
        const newCardLength = this.getNewCardsCount(deckId);
        const warmUpCardLength = warmUpIds.length;
        // randomly choose between new card and warm up card proportional to the number of the cards
        if (newCardLength + warmUpCardLength === 0) {
            return undefined;
        }
        return Math.random() < newCardLength / (newCardLength + warmUpCardLength) ?
            newCard : warmUpId;
    }
    
    getNewCard(deckId: string): number {
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
        if (!deckData) return undefined;
        if (this.getConfig().startPreviouslyStudiedCardFromTheBack) {
            return deckData.previouslyStudied?.[deckData.previouslyStudied.length - 1];
        } else {
            return deckData.previouslyStudied[0];
        }
    }
    
    getNewCardsCount(deckId: string): number {
        return this.getNewCards(deckId).length;
    }
    getPreviouslyStudiedCardCount(deckId: string): number {
        return this.deckData[deckId]?.previouslyStudied.length ?? 0;
    }
    getWarmUpCardsCount(deckId: string): number {
        if (!this.deckData[deckId]?.warmUpIds) return 0;
        return Object.keys(this.deckData[deckId].warmUpIds).length;
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
        if (this.isWarmUpCard(deckId, cardId)) return 'Warm Up';
        const due = this.getCardDue(deckId, cardId);
        if (!due) return 'Not Started';
        return dateDiffFormatted(new Date(), new Date(due));
    }
    getShortCardDueFormatted(deckId: string, cardId: number): string {
        if (this.isWarmUpCard(deckId, cardId)) return '';
        const due = this.getCardDue(deckId, cardId);
        if (!due) return '';
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
            const now = schedulingCards[grade].log.review;
            const due = schedulingCards[grade].card.due;
            ratingScheduledTimeStr[grade] = dateDiffFormatted(now, due);
        }
        return ratingScheduledTimeStr;
    }
    getWenbunCustomState(deckId: string, cardId: number): WenBunCustomState {
        if (this.deckData[deckId]?.warmUpIds?.[cardId] !== undefined) {
            return WenBunCustomState.WarmUp;
        }
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
    getScheduledNewOrWarmUpCardsCount(deckId: string): number {
        const config = this.getConfig();
        const deckData = this.deckData[deckId];
        const newCount = this.getNewCardsCount(deckId);
        const warmUpCount = this.getWarmUpCardsCount(deckId);
        const count = Math.min(newCount + warmUpCount, config.newCardPerDay - deckData.doneTodayNewCardCount);
        return Math.max(0, count);
    }
    getScheduledNewCardsCount(deckId: string): number {
        const scheduledOrWarmUpCount = this.getScheduledNewOrWarmUpCardsCount(deckId);
        return scheduledOrWarmUpCount - this.getWarmUpCardsCount(deckId);
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
    /** this will count how many time the card will appear in the warm-up phase*/
    getTotalScheduledNewOrWarmUpTotalCount(deckId: string): number {
        let count = 0;
        const max = this.getMaxWarmUpCount();
        const newCardsCount = this.getScheduledNewCardsCount(deckId);
        // assume all new cards will be in warm-up phase
        count += newCardsCount * (max + 1);
        if (this.deckData[deckId]?.warmUpIds) {
            Object.values(this.deckData[deckId].warmUpIds).forEach((c) => {
                const remainingWarmUpAppearances = max - c + 1;
                count += remainingWarmUpAppearances;
            });
        }
        return count;
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
            if (isIgnored) return false;
            
            const due = getDaysSinceEpochLocal(new Date(s.due));
            //TODO: make sure this is correct
            if (s.state === FSRS.State.Review) {
                // for review cards, use date
                return due < tomorrow;
            } else {
                // learning and relearning cards is always valid
                return true;
            }
        });
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
    getChineseToneColorArray(): string[] {
        return [1,2,3,4,5].map(i => this.getChineseToneColor(i) ?? '');
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
        const profileStr = this.exportProfileStr();
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
        return this.tryImportProfileStr(payload.data);
    }
    
    getDeckProgress(deckId: string) {
        const deckData = this.deckData[deckId];
        if (!deckData) return {
            totalCount: 1, previouslyStudiedCount: 0,
            youngCount: 0, matureCount: 0, ignoredCount: 0,
        }
        
        const ids = this.getAllNonIgnoredIds(deckId);
        const totalCount = deckData.deck.length;
        const previouslyStudiedCount = deckData.previouslyStudied.length;
        const youngCount = ids.filter((id) => 
            this.getWenbunCustomState(deckId, id) === WenBunCustomState.ReviewYoung).length;
        const matureCount = ids.filter((id) => 
            this.getWenbunCustomState(deckId, id) === WenBunCustomState.ReviewMature).length;
        const ignoredCount = deckData.ignoredIds?.length ?? 0;
        return { totalCount, previouslyStudiedCount, youngCount, matureCount, ignoredCount }
    }
    getDeckProgressNormalized(deckId: string) {
        const p = this.getDeckProgress(deckId);
        return {
            young: p.youngCount / p.totalCount * 100,
            mature: p.matureCount / p.totalCount * 100,
            previouslyStudied: p.previouslyStudiedCount / p.totalCount * 100,
            ignored: p.ignoredCount / p.totalCount * 100,
            rest: (p.totalCount - p.youngCount - p.matureCount - p.previouslyStudiedCount - p.ignoredCount) / p.totalCount * 100,
        }
    }
    
    isAutoGrading(): boolean {
        return this.getConfig().gradingMethod === 'auto';
    }
    
    storeAutoGradeLog(correctCount: number, mistakeCount: number, grade: FSRS.Grade) {
        this.autoReviewGradeLog.push({correctCount, mistakeCount, grade});
    }
    
    getStrokeSpeed(): number {
        return +(window.localStorage.getItem(LOCALSTORAGE_KEY_STROKE_SPEED) ?? 1);
    }
    setStrokeSpeed(speed: number): void {
        window.localStorage.setItem(LOCALSTORAGE_KEY_STROKE_SPEED, speed.toString());
    }
    
    adjustCardLimit(deckId: string, newc: number, previouslyc: number, reviewc: number): void {
        const deckData = this.deckData[deckId];
        if (!deckData) return;
        deckData.doneTodayNewCardCount -= newc;
        deckData.doneTodayPreviouslyStudiedCardCount -= previouslyc;
        deckData.doneTodayReviewCount -= reviewc;
    }
    
    getCurrentAppVersion(): string {
        return __APP_VERSION__;
    }
    getDeckInfo(deckId: string): typeof DeckInfo[number] {
        const deckData = this.deckData[deckId];
        return DeckInfo.find((s) => s.id === deckId) ?? { 
            id: deckId, 
            title: deckData?.label ?? deckId, 
            subtitle: '',
            tags: (deckData?.tags as DECK_TAGS[]) ?? [],
        };
    }
    isNewUpdateExist(): boolean {
        return semverBiggerThan(__APP_VERSION__, this.meta.clientVersion ?? '0.0.0');
    }
    
    renameDeck(deckId: string, newName: string) {
        const deckData = this.deckData[deckId];
        if (!deckData) return;
        deckData.label = newName;
    }
    moveCardsIntoGroup(deckId: string, cardIds: number[], grouplabel: string) {
        const deckData = this.deckData[deckId];
        if (!deckData) return;
        if (deckData.groups.find(g => g.label == grouplabel) == undefined) {
            // create group if not exists
            deckData.groups.push({ label: grouplabel, cardIds: [] });
        }
        
        // remove from all groups (prevent duplicate)
        deckData.groups.forEach(g => {
            g.cardIds = g.cardIds.filter(id => !cardIds.includes(id));
        });
        const group = deckData.groups.find(g => g.label == grouplabel);
        group?.cardIds.push(...cardIds);
    }
    
    setCustomEntry(deckId: string, cardId: number, value: string, type: 'reading' | 'meaning'): void {
        const deckData = this.deckData[deckId];
        if (!deckData) return;
        if (!deckData.customEntry) deckData.customEntry = {};
        if (!deckData.customEntry[cardId]) deckData.customEntry[cardId] = {};
        if (type === 'reading') deckData.customEntry[cardId].r = value;
        if (type === 'meaning') deckData.customEntry[cardId].m = value;
        // cleanup
        if (!deckData.customEntry[cardId].r && !deckData.customEntry[cardId].m) {
            delete deckData.customEntry[cardId];
        }
    }
    getCustomEntryDict(deckId: string) {
        let res: Record<string, {reading?: string, meaning?: string}> = {};
        const deckData = this.deckData[deckId];
        if (!deckData) return {};
        if (!deckData.customEntry) return {};
        Object.entries(deckData.customEntry).forEach(([id, entry]) => {
            const word = deckData.deck[+id];
            res[word] = {reading: entry.r, meaning: entry.m};
        });
        return res;
    }
}