import _ from "lodash";
import { ExtraStudyType, WenBunCustomState, type App, type ExtraStudyConfig } from "./app";
import { base } from "$app/paths";
import { goto } from "$app/navigation";

export enum ExtraStudyMode {
    Normal = "Normal",
    Dictation = "Dictation", // EXPERIMENTAL, play audio instead of show meaning
}

export class AppExtraStudyHandler {
    reviewCardIdsOverride: number[] | undefined = undefined;
    extraStudyLastCardId: number | undefined = undefined;
    
    constructor(private app: App) {
    }
    
    init() {
        this.reviewCardIdsOverride = undefined;
    }
    
    startExtraStudy(deckId: string, cardIds: number[], mode: ExtraStudyMode): void {
        const path = `${base}/review`;
        const queryParams = new URLSearchParams();
        queryParams.set("id", deckId);
        queryParams.set("isExtraStudy", "true");
        if (mode !== ExtraStudyMode.Normal) queryParams.set("mode", mode);
        queryParams.set("cardIds", JSON.stringify(cardIds));
        goto(`${path}?${queryParams}`);
    }
    
    registerReviewCardIdsOverride(cardIds: number[]): void {
        this.reviewCardIdsOverride = cardIds;
    }
    
    isExtraStudy(): boolean {
        return this.reviewCardIdsOverride !== undefined;
    }
    
    getNextCard() {
        if (!this.reviewCardIdsOverride) return;
        if (this.reviewCardIdsOverride.length === 1) {
            return this.reviewCardIdsOverride[0];
        } else {
            // get random card from override except for the latest one
            const cardIds = this.reviewCardIdsOverride.filter((id) => id !== this.extraStudyLastCardId);
            return cardIds[Math.floor(Math.random() * cardIds.length)];
        }
    }
    
    getCardsCount(): number {
        return this.reviewCardIdsOverride?.length ?? 0;
    }
    
    rateAgain(cardId: number) {
        // store the card id make sure the next card will be different 
        // unless there's only one card left
        this.extraStudyLastCardId = cardId;
    }
    rateGood(cardId: number) {
        this.extraStudyLastCardId = cardId;
        if (this.reviewCardIdsOverride) {
            const index = this.reviewCardIdsOverride.indexOf(cardId);
            if (index >= 0) this.reviewCardIdsOverride.splice(index, 1);
        }
    }
    
    getCardIds(deckId: string, config: ExtraStudyConfig): number[] {
        const deckData = this.app.deckData[deckId];
        if (!deckData) return [];
        switch (config.type) {
            case ExtraStudyType.StudiedCards: {
                const allCount = Object.keys(deckData.schedule).length;
                const actualCount = Math.min(allCount, config.count);
                const allIds = Object.keys(deckData.schedule).map((id) => +id);
                return _.shuffle(allIds).slice(0, actualCount);
            }
            case ExtraStudyType.NewCards: {
                const newCount = this.app.getNewCardsCount(deckId);
                const actualCount = Math.min(newCount, config.count);
                const newIds = this.app.getNewCards(deckId);
                return newIds.slice(0, actualCount);
            }
            case ExtraStudyType.YoungCards: {
                const ids = this.app.getAllNonIgnoredIds(deckId);
                const youngIds = ids.filter((id) =>
                    this.app.getWenbunCustomState(deckId, id) === WenBunCustomState.ReviewYoung);
                const actualCount = Math.min(youngIds.length, config.count);
                return _.shuffle(youngIds).slice(0, actualCount);
            }
            case ExtraStudyType.MatureCards: {
                const ids = this.app.getAllNonIgnoredIds(deckId);
                const matureIds = ids.filter((id) =>
                    this.app.getWenbunCustomState(deckId, id) === WenBunCustomState.ReviewMature);
                const actualCount = Math.min(matureIds.length, config.count);
                return _.shuffle(matureIds).slice(0, actualCount);
            }
            case ExtraStudyType.Group: {
                const group = deckData.groups.find((g) => g.label === config.group);
                if (!group) return [];
                return group.cardIds;
            }
            case ExtraStudyType.HardCards: {
                const allCount = Object.keys(deckData.schedule).length;
                const actualCount = Math.min(allCount, config.count);
                // sort by difficulty
                const sorted = Object.entries(deckData.schedule)
                    .sort((a, b) => b[1].difficulty - a[1].difficulty);
                const sortedIds = sorted.map((s) => +s[0]);
                return sortedIds.slice(0, actualCount);
            }
        }
    }
    
    
    getDescription(deckId: string, config: ExtraStudyConfig): {desc: string, subdesc: string} {
        const deckData = this.app.deckData[deckId];
        if (!deckData) return {desc: '', subdesc: ''};
        switch (config.type) {
            case ExtraStudyType.StudiedCards: {
                const allCount = Object.keys(deckData.schedule).length;
                const actualCount = Math.min(allCount, config.count);
                return {
                    desc:`Study ${actualCount} cards`,
                    subdesc: `(out of ${allCount} cards that have been studied in this deck)`
                }
            }
            case ExtraStudyType.NewCards: {
                const newCount = this.app.getNewCardsCount(deckId);
                const actualCount = Math.min(newCount, config.count);
                return {
                    desc:`Study the next ${actualCount} new cards`,
                    subdesc: `(out of ${newCount} new cards)`
                }
            }
            case ExtraStudyType.YoungCards: {
                const ids = this.app.getAllNonIgnoredIds(deckId);
                const youngIds = ids.filter((id) => 
                    this.app.getWenbunCustomState(deckId, id) === WenBunCustomState.ReviewYoung);
                const actualCount = Math.min(youngIds.length, config.count);
                return {
                    desc:`Study ${actualCount} young cards`,
                    subdesc: `(out of ${youngIds.length} young cards)`
                }
            }
            case ExtraStudyType.MatureCards: {
                const ids = this.app.getAllNonIgnoredIds(deckId);
                const matureIds = ids.filter((id) => 
                    this.app.getWenbunCustomState(deckId, id) === WenBunCustomState.ReviewMature);
                const actualCount = Math.min(matureIds.length, config.count);
                return {
                    desc:`Study ${actualCount} mature cards`,
                    subdesc: `(out of ${matureIds.length} mature cards)`
                }
            }
            case ExtraStudyType.Group: {
                const group = deckData.groups.find((g) => g.label === config.group);
                if (!group) return {desc: 'ERROR: Group Not Found', subdesc: ''};
                const actualCount = Math.min(group.cardIds.length, config.count);
                return {
                    desc:`Study ${actualCount} cards from ${config.group}`,
                    subdesc: `(out of ${group.cardIds.length} cards)`
                }
            }
            case ExtraStudyType.HardCards: {
                const allCount = Object.keys(deckData.schedule).length;
                const actualCount = Math.min(allCount, config.count);
                return {
                    desc:`Study ${actualCount} hardest cards`,
                    subdesc: `(out of ${allCount} cards that have been studied in this app)`
                }
            }
        }
    }
    
    
}