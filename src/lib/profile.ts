import type { ProfileData, ReviewLog } from "./app";
import type { App } from "./app";
import { goto } from '$app/navigation';
import { base } from "$app/paths";
import { page } from '$app/state';
import { ApiRoute, apiUrl, apiAuthUrl, apiFetch, IS_USE_TOKEN_AUTH } from "./api";
import _ from "lodash";
import type { IStorage } from "./storage";
import { isOnlineClient } from "./util";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from '@tauri-apps/plugin-opener';

const STORE_KEY_LOGIN_STATUS = "loginStatus"
const STORE_KEY_BACKUP_PROFILE_DATA_BEFORE_LOGIN = "backupProfileDataBeforeLogin"
const STORE_KEY_SYNC_MODE = "syncMode"

export enum SyncMode {
    auto = "auto",
    manual = "manual",
}

export enum SyncDecision {
    push = "push",
    pull = "pull",
    none = "none",
    conflict = "conflict",
}

export enum SyncConflicAutoResolve {
    ask = "ask",
    forcePull = "forcePull",
    forcePush = "forcePush",
    normalPull = "normalPull", // don't use conflict resolution, just pull
    normalPush = "normalPush", // don't use conflict resolution, just push
}

export enum LoginStatus {
    loggedIn = "loggedIn",
    loggedOut = "loggedOut",
}

export enum ManualSyncStatus {
    noSync = "noSync",
    canPull = "canPull",
    canPush = "canPush",
    conflict = "conflict",
}


export interface ProfileInfo {
    id: string;
    email: string;
    name: string;
}

export interface DeckInfoSummary {
    id: string;
    label?: string;
    studiedCount: number;
    totalCount: number;
}

export interface SyncConflictInfo {
    localModifiedAt: Date;
    remoteModifiedAt: Date;
    lastSyncTime: Date;
    localDeckInfo: DeckInfoSummary[];
    remoteDeckInfo: DeckInfoSummary[];
}

export class Profile {
    isLoggedIn: boolean = false;
    isSyncConflict: boolean = false;
    syncConflictInfo: SyncConflictInfo | undefined;
    profileInfo: ProfileInfo | null = null;
    storedLoginStatus: LoginStatus | undefined = undefined;
    justLoggenIn: boolean = false;
    
    constructor(private storage: IStorage) {
    }
    
    async init() {
        this.storedLoginStatus = await this.storage.load<LoginStatus>(STORE_KEY_LOGIN_STATUS);
            
        const res = await apiFetch(apiUrl(ApiRoute.Profile));

        if (res.ok) {
            // logged in
            const json = await res.json();
            this.isLoggedIn = true;
            this.profileInfo = json;
        } else if (res.status === 401) {
            // not logged in
            this.isLoggedIn = false;
        } else {
            // some other failure (e.g., server error)
            this.isLoggedIn = false;
            console.warn(`Unexpected status: ${res.status}`);
        }
        if (this.isLoggedIn && this.storedLoginStatus !== LoginStatus.loggedIn) {
            this.justLoggenIn = true;
            this.updateLoginStatus(LoginStatus.loggedIn);
        }
    }
    
    async updateLoginStatus(status: LoginStatus | undefined) {
        await this.storage.save(STORE_KEY_LOGIN_STATUS, status);
        this.storedLoginStatus = status;
    }
    
    /**
     * @returns boolean: `true` if data changed
     */
    async trySyncProfile(app: App, syncConflictAutoResolveStrategy = SyncConflicAutoResolve.ask): Promise<boolean> {
        if (!this.isLoggedIn) return false;
        try {
            const [remoteProfileData, latestServerReviewLog] = await Promise.all([
                this.getProfileData(),
                this.getLatestReviewLog(),
            ]);
            if (remoteProfileData === null) {
                // upload profiledata and logs
                const success = await Promise.all([
                    this.updateProfileData(app.exportProfile(false)),
                    this.pushReviewLog(latestServerReviewLog, app.reviewLogs, true),
                ])
                if (success.every(s => s)) {
                    app.lastSyncTime = new Date().toISOString();
                    await app.updateLastSyncTime();
                }
                return false;
            } else {
                // check
                const localModifiedAt = new Date(app.meta.modifiedAt ?? 0);
                const remoteModifiedAt = new Date(remoteProfileData.meta.modifiedAt ?? 0);
                const lastSyncTime = new Date(app.lastSyncTime ?? 0);
                const syncDecisionFromTime = this.getSyncDecision(localModifiedAt, remoteModifiedAt, lastSyncTime);
                let syncDecision = (_.isEqual(remoteProfileData, app.exportProfile(false))) ? SyncDecision.none : syncDecisionFromTime;
                syncDecision = await this.autoResolveSyncConflict(syncDecision, syncConflictAutoResolveStrategy, app);
                switch (syncDecision) {
                    case SyncDecision.conflict: {
                        this.onConflict(app, remoteProfileData, lastSyncTime);
                        return false;
                    }
                    case SyncDecision.push: {
                        const success = await Promise.all([
                            this.updateProfileData(app.exportProfile(false)),
                            this.pushReviewLog(latestServerReviewLog, app.reviewLogs),
                        ])
                        if (success.every(s => s)) {
                            app.lastSyncTime = new Date().toISOString();
                            await app.updateLastSyncTime();
                        } else {
                            window.alert("Failed to push profile data to server")
                        }
                        this.isSyncConflict = false;
                        return false;
                    }
                    case SyncDecision.pull: {
                        const success = await Promise.all([
                            app.tryImportProfile(remoteProfileData, false, true),
                            this.pullReviewLog(app),
                        ])
                        if (success.every(s => s)) {
                            app.lastSyncTime = new Date().toISOString();
                            await app.updateLastSyncTime();
                        } else {
                            window.alert("Failed to pull profile data from server")
                        }
                        this.isSyncConflict = false;
                        return true;
                    }
                    case SyncDecision.none: {
                        // do nothing
                        this.isSyncConflict = false;
                        return false;
                    }
                }
            }
        } catch (e) {
            console.error(e);
            //TODO: not sure if something went wrong whether to return true or false
            return false;
        }
    }
    
    async onConflict(app: App, remoteProfileData: ProfileData, lastSyncTime: Date, showAlert = true) {
        const localProfileData = app.exportProfile(false);
        const localModifiedAt = new Date(localProfileData.meta.modifiedAt ?? 0);
        const remoteModifiedAt = new Date(remoteProfileData.meta.modifiedAt ?? 0);;
        this.syncConflictInfo = { 
            localModifiedAt, remoteModifiedAt, lastSyncTime, 
            localDeckInfo: app.getProfileDataDeckSummary(localProfileData),
            remoteDeckInfo: app.getProfileDataDeckSummary(remoteProfileData),
        };
        this.isSyncConflict = true;
        if (showAlert) {
            // check path if already in settings
            const isAlreadyInSettings = page.url.pathname.startsWith("/settings");
            if (!isAlreadyInSettings) {
                const isGotoSettings = window.confirm("Sync Failed, Conflict Detected. Do you want to go to settings?");
                if (isGotoSettings) {
                    goto(`${base}/settings/`);
                }
            }
        }
    }
    
    async autoResolveSyncConflict(decision: SyncDecision, strategy: SyncConflicAutoResolve, app: App): Promise<SyncDecision> {
        if (decision !== SyncDecision.conflict) return decision;
        switch (strategy) {
            case SyncConflicAutoResolve.ask: {
                return SyncDecision.conflict;
            }
            case SyncConflicAutoResolve.normalPull: {
                return SyncDecision.pull;
            }
            case SyncConflicAutoResolve.normalPush: {
                return SyncDecision.push;
            }
            case SyncConflicAutoResolve.forcePull: {
                await this.tryForcePull(app);
                return SyncDecision.pull;
            }
            case SyncConflicAutoResolve.forcePush: {
                await this.tryForcePush(app);
                return SyncDecision.push;
            }
        }
    }
    
    async tryForcePull(app: App) {
        // will use the remote data, but push the current local data as backup to the server
        const remoteProfileData = await this.getProfileData();
        const success = await Promise.all([
            this.updateProfileData(app.exportProfile(false), "pull"),
            this.pullReviewLog(app, true),
        ]);
        const success2 = await app.tryImportProfile(remoteProfileData, false, true);
        if (success.every(s => s) && success2) {
            app.lastSyncTime = new Date().toISOString();
            await app.updateLastSyncTime();
            this.isSyncConflict = false;
        } else {
            window.alert("Failed to pull profile data from server")
        }
    }
    
    async tryForcePush(app: App) {
        const success = await Promise.all([
            this.updateProfileData(app.exportProfile(false), "push"),
            this.pushReviewLog(null, app.reviewLogs ?? [], true),
        ])
        if (success.every(s => s)) {
            app.lastSyncTime = new Date().toISOString();
            await app.updateLastSyncTime();
            this.isSyncConflict = false;
        } else {
            window.alert("Failed to push profile data to server")
        }
    }
    
    getSyncDecision(localModifiedAt: Date, remoteModifiedAt: Date, lastSyncTime: Date, toleranceMs = 100): SyncDecision {
        const isLocalModified = localModifiedAt.getTime() - lastSyncTime.getTime() > toleranceMs;
        const isRemoteModified = remoteModifiedAt.getTime() - lastSyncTime.getTime() > toleranceMs;
        if (isLocalModified && isRemoteModified) {
            return SyncDecision.conflict;
        } else if (isLocalModified) {
            return SyncDecision.push;
        } else if (isRemoteModified) {
            return SyncDecision.pull;
        } else {
            return SyncDecision.none;
        }
    }
    
    getName() {
        return this.profileInfo?.name ?? this.profileInfo?.email ?? "(no name)";
    }
    
    async getProfileData(): Promise<ProfileData | null> {
        const res = await apiFetch(apiUrl(ApiRoute.ProfileData));
        if (res.status === 204) {
            return null;
        } else if (res.ok) {
            const profileData = await res.json();
            return profileData;
        } else {
            throw new Error(`Unexpected status: ${res.status}`);
        }
    }
    
    async updateProfileData(profileData: ProfileData, decision: 'normal'|'pull'|'push' = 'normal'): Promise<boolean> {
        //TODO: check for conflict
        const res = await apiFetch(apiUrl(ApiRoute.ProfileData, { decision }), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(profileData),
        });
        return res.ok;
    }
    
    async getLatestReviewLog(): Promise<ReviewLog | null> {
        const res = await apiFetch(apiUrl(ApiRoute.ReviewLogMostRecent));
        if (res.status === 204) {
            return null;
        } else if (res.ok) {
            const reviewLog = await res.json();
            return reviewLog;
        } else {
            throw new Error(`Unexpected status: ${res.status}`);
        }
    }
    
    async pushReviewLog(latestServerReviewLog: ReviewLog | null, localReviewLogs?: ReviewLog[], force = false) {
        if (!localReviewLogs || localReviewLogs.length === 0) {
            return true;
        } else if (latestServerReviewLog === null || force) {
            // push all
            const res = await apiFetch(apiUrl(ApiRoute.ReviewLog, { force }), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(localReviewLogs),
            });
            return res.ok;
        } else {
            // push all after latestServerReviewLog
            const latestServerMs = +new Date(latestServerReviewLog.log?.review ?? 0);
            const cut = localReviewLogs.findLastIndex(l => {
                const v = l.log?.review;
                const ms = +new Date(v ?? 0);
                return ms <= latestServerMs;
            });
            const localReviewLogsAfterLatestServerReviewLog = localReviewLogs.slice(cut + 1);
            const res = await apiFetch(apiUrl(ApiRoute.ReviewLog), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(localReviewLogsAfterLatestServerReviewLog),
            });
            return res.ok;
        }
    }
    
    async pullReviewLog(app: App, force = false): Promise<boolean> {
        try {
            const pulledReviewLogs = await this.getReviewLogs(app.reviewLogs, force);
            if (pulledReviewLogs === null) return true; // server may have no review logs
            if (force) {
                app.reviewLogs = pulledReviewLogs;
            } else {
                app.reviewLogs.push(...pulledReviewLogs);
            }
            app.save(false);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }
    
    async getReviewLogs(localReviewLogs: ReviewLog[], force = false): Promise<ReviewLog[] | null> {
        if (force) {
            const fromDate = new Date(0).toISOString();
            const res = await apiFetch(apiUrl(ApiRoute.ReviewLog, { from: fromDate }), {
                method: "GET",
            });
            
            if (res.status === 204) {
                return null;
            } else if (res.ok) {
                const reviewLogs = await res.json();
                return reviewLogs.map((l: any) => l.review_log);
            } else {
                throw new Error(`Unexpected status: ${res.status}`);
            }
        } else {
            // pull only after latest local review log
            const latestLocalReviewLog = localReviewLogs[localReviewLogs.length - 1];
            const latestLocalDate = new Date(latestLocalReviewLog?.log?.review ?? 0).toISOString();
            const res = await apiFetch(apiUrl(ApiRoute.ReviewLog, { from: latestLocalDate }), {
                method: "GET",
            });
            
            if (res.status === 204) {
                return null;
            } else if (res.ok) {
                const reviewLogs = await res.json();
                return reviewLogs;
            } else {
                throw new Error(`Unexpected status: ${res.status}`);
            }
        }
    }
    
    async loginGoogle(app: App) {
        await this.saveBackupProfileDataBeforeLogin(app);
        // TODO: compare with stored login info
        if (isTauri()) {
            // TODO: maybe different 
            const scheme = "wenbun://"
            const url = apiAuthUrl(ApiRoute.AuthGoogleToken) + "?redirect=" + encodeURIComponent(scheme + 'auth-token')
            openUrl(url);
        } else {
            window.location.assign(apiAuthUrl(ApiRoute.AuthGoogle) + "?redirect=" + encodeURIComponent(window.location.href));
        }
    }
    async logout(app: App) {
        await this.updateLoginStatus(LoginStatus.loggedOut);
        await app.updateLastSyncTime(new Date(0));
        if (isTauri()) {
            localStorage.removeItem('jwt');
        }
        window.location.assign(apiAuthUrl(ApiRoute.AuthLogout) + "?redirect=" + encodeURIComponent(window.location.href));
    }
   
    /**
     * Check if the user is automatically logged out,
     * maybe because the session has expired or server issue
     */
    isAutomaticallyLoggedOut(): boolean {
        // not currently logged in, but stored as logged in
        return !this.isLoggedIn && this.storedLoginStatus === LoginStatus.loggedIn;
    }
    
    async saveBackupProfileDataBeforeLogin(app: App) {
        const profileData = app.exportProfileStr();
        await this.storage.save(STORE_KEY_BACKUP_PROFILE_DATA_BEFORE_LOGIN, profileData);
    }
    async getBackupProfileDataBeforeLogin(): Promise<string | null> {
        const res = await this.storage.load<string>(STORE_KEY_BACKUP_PROFILE_DATA_BEFORE_LOGIN);
        if (res === undefined) return null;
        return res;
    }
    
    async getSyncMode(): Promise<SyncMode> {
        let res = await this.storage.load<SyncMode>(STORE_KEY_SYNC_MODE);
        res ??= isOnlineClient() ? SyncMode.auto : SyncMode.manual;
        return res;
    }
    async setSyncMode(mode: SyncMode) {
        await this.storage.save(STORE_KEY_SYNC_MODE, mode);
    }
    
    async getManualSyncStatus(app: App): Promise<ManualSyncStatus | undefined> {
        if (!this.isLoggedIn) return undefined;
        try {
            const remoteProfileData = await this.getProfileData();
            if (remoteProfileData === null) {
                return ManualSyncStatus.canPush;
            } else {
                // check
                const localModifiedAt = new Date(app.meta.modifiedAt ?? 0);
                const remoteModifiedAt = new Date(remoteProfileData.meta.modifiedAt ?? 0);;
                const lastSyncTime = new Date(app.lastSyncTime ?? 0);
                const syncDecisionFromTime = this.getSyncDecision(localModifiedAt, remoteModifiedAt, lastSyncTime);
                let syncDecision = (_.isEqual(remoteProfileData, app.exportProfile(false))) ? SyncDecision.none : syncDecisionFromTime;
                switch (syncDecision) {
                    case SyncDecision.push: return ManualSyncStatus.canPush;
                    case SyncDecision.pull: return ManualSyncStatus.canPull;
                    case SyncDecision.none: return ManualSyncStatus.noSync;
                    case SyncDecision.conflict: {
                        this.onConflict(app, remoteProfileData, lastSyncTime, false);
                        return ManualSyncStatus.conflict;
                    }
                }
            }
        } catch (e) {
            return undefined;
        }
        return undefined;
    }
    
    static async sendAccountDeletionRequest(email: string) {
        await apiFetch(apiUrl(ApiRoute.AccountDeletionRequest), { 
            method: "POST", 
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email })
        });
    }
}