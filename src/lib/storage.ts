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