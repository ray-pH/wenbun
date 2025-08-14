import type { ProfileData, ReviewLog } from "./app";
import type { App } from "./app";
import { goto } from '$app/navigation';
import { base } from "$app/paths";
import { page } from '$app/state';
import { ApiRoute, apiUrl, apiAuthUrl } from "./api";
import _ from "lodash";
import type { IStorage } from "./storage";

const STORE_KEY_LOGIN_STATUS = "loginStatus"

export enum SyncDecision {
    push = "push",
    pull = "pull",
    none = "none",
    conflict = "conflict",
}

export enum LoginStatus {
    loggedIn = "loggedIn",
    loggedOut = "loggedOut",
}

export interface ProfileInfo {
    id: string;
    email: string;
    name: string;
}

export interface SyncConflictInfo {
    localModifiedAt: Date;
    remoteModifiedAt: Date;
    lastSyncTime: Date;
}

export class Profile {
    isLoggedIn: boolean = false;
    isSyncConflict: boolean = false;
    syncConflictInfo: SyncConflictInfo | undefined;
    profileInfo: ProfileInfo | null = null;
    storedLoginStatus: LoginStatus | undefined = undefined;
    
    constructor(private storage: IStorage) {
    }
    
    async init() {
        this.storedLoginStatus = await this.storage.load<LoginStatus>(STORE_KEY_LOGIN_STATUS);
            
        const res = await fetch(apiUrl(ApiRoute.Profile), {
            credentials: "include", // important if using cookies/session
        });

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
        await this.checkAndUpdateLoginStatus();
    }
    
    async updateLoginStatus(status: LoginStatus | undefined) {
        await this.storage.save(STORE_KEY_LOGIN_STATUS, status);
        this.storedLoginStatus = status;
    }
    async checkAndUpdateLoginStatus() {
        // if currently undefined, store isLoggedIn
        if (this.storedLoginStatus === undefined) {
            const status = this.isLoggedIn ? LoginStatus.loggedIn : LoginStatus.loggedOut;
            await this.updateLoginStatus(status);
        }
    }
    
    async trySyncProfile(app: App) {
        if (!this.isLoggedIn) return;
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
            } else {
                // check
                const localModifiedAt = new Date(app.meta.modifiedAt ?? 0);
                const remoteModifiedAt = new Date(remoteProfileData.meta.modifiedAt ?? 0);;
                const lastSyncTime = new Date(app.lastSyncTime ?? 0);
                const syncDecisionFromTime = this.getSyncDecision(localModifiedAt, remoteModifiedAt, lastSyncTime);
                const syncDecision = (_.isEqual(remoteProfileData, app.exportProfile(false))) ? SyncDecision.none : syncDecisionFromTime;
                switch (syncDecision) {
                    case SyncDecision.conflict: {
                        this.syncConflictInfo = { localModifiedAt, remoteModifiedAt, lastSyncTime };
                        this.isSyncConflict = true;
                        // check path if already in settings
                        const isAlreadyInSettings = page.url.pathname.startsWith("/settings");
                        if (!isAlreadyInSettings) {
                            const isGotoSettings = window.confirm("Sync Failed, Conflict Detected. Do you want to go to settings?");
                            if (isGotoSettings) {
                                goto(`${base}/settings/`);
                            }
                        }
                    } break;
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
                    } break;
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
                    } break;
                    case SyncDecision.none: {
                        // do nothing
                        this.isSyncConflict = false;
                    }
                }
            }
        } catch (e) {
            console.error(e);
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
            this.pushReviewLog(null, app.reviewLogs, true),
        ])
        if (success.every(s => s)) {
            app.lastSyncTime = new Date().toISOString();
            await app.updateLastSyncTime();
            this.isSyncConflict = false;
        } else {
            window.alert("Failed to push profile data to server")
        }
    }
    
    getSyncDecision(localModifiedAt: Date, remoteModifiedAt: Date, lastSyncTime: Date): SyncDecision {
        const isLocalModified = localModifiedAt > lastSyncTime;
        const isRemoteModified = remoteModifiedAt > lastSyncTime;
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
        return this.profileInfo?.name ?? "(no name)";
    }
    
    async getProfileData(): Promise<ProfileData | null> {
        const res = await fetch(apiUrl(ApiRoute.ProfileData), {credentials: "include"});
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
        const res = await fetch(apiUrl(ApiRoute.ProfileData, { decision }), {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(profileData),
        });
        return res.ok;
    }
    
    async getLatestReviewLog(): Promise<ReviewLog | null> {
        const res = await fetch(apiUrl(ApiRoute.ReviewLogMostRecent), {credentials: "include"});
        if (res.status === 204) {
            return null;
        } else if (res.ok) {
            const reviewLog = await res.json();
            return reviewLog;
        } else {
            throw new Error(`Unexpected status: ${res.status}`);
        }
    }
    
    async pushReviewLog(latestServerReviewLog: ReviewLog | null, localReviewLogs: ReviewLog[], force = false) {
        if (latestServerReviewLog === null || force) {
            // push all
            const res = await fetch(apiUrl(ApiRoute.ReviewLog, { force }), {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(localReviewLogs),
            });
            return res.ok;
        } else {
            // push all after latestServerReviewLog
            const latestServerMs = +new Date(latestServerReviewLog.log.review);
            const cut = localReviewLogs.findLastIndex(l => {
                const v = l.log.review;
                const ms = +new Date(v);
                return ms <= latestServerMs;
            });
            const localReviewLogsAfterLatestServerReviewLog = localReviewLogs.slice(cut + 1);
            const res = await fetch(apiUrl(ApiRoute.ReviewLog), {
                method: "POST",
                credentials: "include",
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
            const res = await fetch(apiUrl(ApiRoute.ReviewLog, { from: fromDate }), {
                method: "GET",
                credentials: "include",
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
            const res = await fetch(apiUrl(ApiRoute.ReviewLog, { from: latestLocalDate }), {
                method: "GET",
                credentials: "include",
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
        // TODO: compare with stored login info
        window.location.assign(apiAuthUrl(ApiRoute.AuthGoogle));
    }
    async logout(app: App) {
        await this.updateLoginStatus(undefined);
        await app.updateLastSyncTime(new Date(0));
        window.location.assign(apiAuthUrl(ApiRoute.AuthLogout));
    }
   
    /**
     * Check if the user is automatically logged out,
     * maybe because the session has expired or server issue
     */
    isAutomaticallyLoggedOut(): boolean {
        // not currently logged in, but stored as logged in
        return !this.isLoggedIn && this.storedLoginStatus === LoginStatus.loggedIn;
    }
}