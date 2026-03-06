import * as SQLite from 'expo-sqlite';

interface ProviderKeyRecord {
  provider: string;
  customKey: string | null;
  useDefault: number;
  modelName: string | null;
  baseUrl: string | null;
  displayName: string | null;
  systemInstruction: string | null;
}

class ProviderKeyStorage {
  private db: SQLite.SQLiteDatabase | null = null;
  private dbName = 'app_settings.db';

  async initialize(): Promise<void> {
    if (this.db) return;
    this.db = await SQLite.openDatabaseAsync(this.dbName);
    await this.createTable();
  }

  private async createTable(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS api_keys (
        provider TEXT PRIMARY KEY,
        customKey TEXT,
        useDefault INTEGER,
        modelName TEXT,
        baseUrl TEXT,
        displayName TEXT,
        systemInstruction TEXT
      );

      CREATE TABLE IF NOT EXISTS app_preferences (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    await this.ensureApiKeyColumns();
  }

  private async ensureApiKeyColumns(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const columns = await this.db.getAllAsync<{ name: string }>('PRAGMA table_info(api_keys)');
    const hasBaseUrl = columns.some(col => col.name === 'baseUrl');
    if (!hasBaseUrl) {
      await this.db.execAsync('ALTER TABLE api_keys ADD COLUMN baseUrl TEXT;');
    }
    const hasDisplayName = columns.some(col => col.name === 'displayName');
    if (!hasDisplayName) {
      await this.db.execAsync('ALTER TABLE api_keys ADD COLUMN displayName TEXT;');
    }
    const hasSystemInstruction = columns.some(col => col.name === 'systemInstruction');
    if (!hasSystemInstruction) {
      await this.db.execAsync('ALTER TABLE api_keys ADD COLUMN systemInstruction TEXT;');
    }
  }

  private getDatabase(): SQLite.SQLiteDatabase {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  async getEntry(provider: string): Promise<ProviderKeyRecord | null> {
    const db = this.getDatabase();
    const row = await db.getFirstAsync<ProviderKeyRecord>(
      'SELECT provider, customKey, useDefault, modelName, baseUrl, displayName, systemInstruction FROM api_keys WHERE provider = ?',
      [provider]
    );

    if (!row) {
      return null;
    }

    return {
      provider: row.provider,
      customKey: row.customKey ?? null,
      useDefault: row.useDefault ?? 1,
      modelName: row.modelName ?? null,
      baseUrl: row.baseUrl ?? null,
      displayName: row.displayName ?? null,
      systemInstruction: row.systemInstruction ?? null,
    };
  }

  async listAll(): Promise<ProviderKeyRecord[]> {
    const db = this.getDatabase();
    const rows = await db.getAllAsync<ProviderKeyRecord>(
      'SELECT provider, customKey, useDefault, modelName, baseUrl, displayName, systemInstruction FROM api_keys'
    );
    return rows.map(row => ({
      provider: row.provider,
      customKey: row.customKey ?? null,
      useDefault: row.useDefault ?? 1,
      modelName: row.modelName ?? null,
      baseUrl: row.baseUrl ?? null,
      displayName: row.displayName ?? null,
      systemInstruction: row.systemInstruction ?? null,
    }));
  }

  async deleteEntry(provider: string): Promise<void> {
    const db = this.getDatabase();
    await db.runAsync('DELETE FROM api_keys WHERE provider = ?', [provider]);
  }

  async upsertEntry(provider: string, updates: Partial<ProviderKeyRecord>): Promise<void> {
    const current = await this.getEntry(provider);
    const record: ProviderKeyRecord = {
      provider,
      customKey: updates.customKey !== undefined ? updates.customKey : current?.customKey ?? null,
      useDefault: updates.useDefault !== undefined ? updates.useDefault : current?.useDefault ?? 1,
      modelName: updates.modelName !== undefined ? updates.modelName : current?.modelName ?? null,
      baseUrl: updates.baseUrl !== undefined ? updates.baseUrl : current?.baseUrl ?? null,
      displayName: updates.displayName !== undefined ? updates.displayName : current?.displayName ?? null,
      systemInstruction: updates.systemInstruction !== undefined ? updates.systemInstruction : current?.systemInstruction ?? null,
    };

    const db = this.getDatabase();
    const displayName = record.displayName;
    const systemInstruction = record.systemInstruction;
    await db.runAsync(
      'INSERT INTO api_keys (provider, customKey, useDefault, modelName, baseUrl, displayName, systemInstruction) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(provider) DO UPDATE SET customKey=excluded.customKey, useDefault=excluded.useDefault, modelName=excluded.modelName, baseUrl=excluded.baseUrl, displayName=excluded.displayName, systemInstruction=excluded.systemInstruction',
      [record.provider, record.customKey, record.useDefault, record.modelName, record.baseUrl, displayName, systemInstruction]
    );
  }

  async setPreference(key: string, value: string | null): Promise<void> {
    const db = this.getDatabase();
    if (value === null) {
      await db.runAsync('DELETE FROM app_preferences WHERE key = ?', [key]);
    } else {
      await db.runAsync(
        'INSERT OR REPLACE INTO app_preferences (key, value) VALUES (?, ?)',
        [key, value]
      );
    }
  }

  async getPreference(key: string): Promise<string | null> {
    const db = this.getDatabase();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_preferences WHERE key = ?',
      [key]
    );
    return row?.value ?? null;
  }
}

export const providerKeyStorage = new ProviderKeyStorage();
export default providerKeyStorage;