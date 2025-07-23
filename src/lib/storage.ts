import { load, Store } from '@tauri-apps/plugin-store';

export interface IStorage {
  load<T>(key: string): Promise<T | undefined>;
  save<T>(key: string, value: T): Promise<void>;
}

export class TauriStorage implements IStorage {
  private storeFilename: string;
  private store: Store | null = null;
  private isLoaded: boolean = false;

  constructor(storeFilename: string) {
    this.storeFilename = storeFilename;
  }

  private async ensureStoreLoaded(): Promise<void> {
    if (!this.isLoaded) {
      this.store = await load(this.storeFilename, { autoSave: false });
      this.isLoaded = true;
    }
  }

  public async load<T>(key: string): Promise<T | undefined> {
    await this.ensureStoreLoaded();
    if (!this.store) return undefined;
    return await this.store.get(key);
  }

  public async save<T>(key: string, value: T): Promise<void> {
    await this.ensureStoreLoaded();
    if (!this.store) return;
    await this.store.set(key, value);
  }
}

const DEFAULT_DB_NAME = 'wenbun-deck-manager';
export class BrowserIndexedDBStorage implements IStorage {
    private storeName: string;
    private db: any;
    
    constructor(storeName: string) {
        this.storeName = storeName;
    }
    
    private async ensureDBLoaded(): Promise<void> {
        if (this.db) return new Promise<void>((resolve) => resolve());
        return new Promise<void>((resolve, reject) => {
            const request = window.indexedDB.open(DEFAULT_DB_NAME, 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            }
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            }
            request.onerror = (e) => {
                window.alert('Error opening database');
                reject(e);
            }
        });
    }
    
    public async load<T>(key: string): Promise<T | undefined> {
        await this.ensureDBLoaded();
        return new Promise<T | undefined>((resolve, reject) => {
          if (!this.db) return resolve(undefined);
          const tx = this.db.transaction(this.storeName, 'readonly');
          const store = tx.objectStore(this.storeName);
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result as T | undefined);
          req.onerror = () => reject(req.error);
        });
    }
    public async save<T>(key: string, value: T): Promise<void> {
        await this.ensureDBLoaded();
        return new Promise<void>((resolve, reject) => {
          if (!this.db) return resolve();
          const tx = this.db.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          const req = store.put(value, key);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
    }
}