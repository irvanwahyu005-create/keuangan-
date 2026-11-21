import { buildInitialSeedData, DEFAULT_BUDGETS } from '../data/smartCatalog';
import type {
  CategoryBudget,
  GroceryDraftItem,
  KasRumahBackupPayload,
  RecurringExpense,
  ReminderSettings,
  SyncSettings,
  Transaction,
} from '../types/finance';
import { getTodayISO } from '../utils/format';

const DB_NAME = 'KasRumahDB';
const DB_VERSION = 1;

const STORES = {
  transactions: 'transactions',
  budgets: 'budgets',
  recurring: 'recurring',
  groceryDraft: 'groceryDraft',
  meta: 'meta',
} as const;

const LS_FALLBACK_KEY = 'kas_rumah_offline_snapshot_v1';
const LS_THEME_KEY = 'kas_rumah_theme_v1';

export interface PersistedState {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  recurring: RecurringExpense[];
  groceryDraft: GroceryDraftItem[];
  reminderSettings: ReminderSettings;
  syncSettings: SyncSettings;
}

const DEFAULT_REMINDER: ReminderSettings = {
  enabled: false,
  time: '20:00',
};

const DEFAULT_SYNC: SyncSettings = {
  autoSyncEnabled: true,
  driveFileName: 'kas_rumah_backup.json',
  hasPendingChanges: false,
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.transactions)) {
        db.createObjectStore(STORES.transactions, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.budgets)) {
        db.createObjectStore(STORES.budgets, { keyPath: 'category' });
      }
      if (!db.objectStoreNames.contains(STORES.recurring)) {
        db.createObjectStore(STORES.recurring, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.groceryDraft)) {
        db.createObjectStore(STORES.groceryDraft, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function readAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

function replaceStoreItems<T>(db: IDBDatabase, storeName: string, items: T[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadPersistedState(): Promise<PersistedState> {
  try {
    const db = await openDatabase();
    const [transactions, budgets, recurring, groceryDraft, metaRows] = await Promise.all([
      readAllFromStore<Transaction>(db, STORES.transactions),
      readAllFromStore<CategoryBudget>(db, STORES.budgets),
      readAllFromStore<RecurringExpense>(db, STORES.recurring),
      readAllFromStore<GroceryDraftItem>(db, STORES.groceryDraft),
      readAllFromStore<{ key: string; value: unknown }>(db, STORES.meta),
    ]);

    const metaMap = new Map(metaRows.map((row) => [row.key, row.value]));
    const initialized = Boolean(metaMap.get('initialized'));

    if (!initialized) {
      // Check localStorage fallback before seeding
      const lsRaw = localStorage.getItem(LS_FALLBACK_KEY);
      if (lsRaw) {
        const parsed = JSON.parse(lsRaw) as PersistedState;
        await savePersistedState(parsed);
        db.close();
        return parsed;
      }

      const seed = buildInitialSeedData(getTodayISO());
      const initialState: PersistedState = {
        ...seed,
        reminderSettings: DEFAULT_REMINDER,
        syncSettings: DEFAULT_SYNC,
      };
      await savePersistedState(initialState);
      db.close();
      return initialState;
    }

    const reminderSettings = (metaMap.get('reminderSettings') as ReminderSettings) ?? DEFAULT_REMINDER;
    const syncSettings = (metaMap.get('syncSettings') as SyncSettings) ?? DEFAULT_SYNC;

    db.close();
    return {
      transactions,
      budgets: budgets.length > 0 ? budgets : DEFAULT_BUDGETS,
      recurring,
      groceryDraft,
      reminderSettings,
      syncSettings,
    };
  } catch {
    // Fallback to localStorage if IndexedDB fails
    const raw = localStorage.getItem(LS_FALLBACK_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as PersistedState;
      } catch {
        // ignore
      }
    }
    const seed = buildInitialSeedData(getTodayISO());
    return {
      ...seed,
      reminderSettings: DEFAULT_REMINDER,
      syncSettings: DEFAULT_SYNC,
    };
  }
}

export async function savePersistedState(state: PersistedState): Promise<void> {
  // Always mirror compact backup in localStorage for instant resilience
  try {
    localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(state));
  } catch {
    // quota exceeded in localStorage; IndexedDB still persists
  }

  try {
    const db = await openDatabase();
    await Promise.all([
      replaceStoreItems(db, STORES.transactions, state.transactions),
      replaceStoreItems(db, STORES.budgets, state.budgets),
      replaceStoreItems(db, STORES.recurring, state.recurring),
      replaceStoreItems(db, STORES.groceryDraft, state.groceryDraft),
      replaceStoreItems(db, STORES.meta, [
        { key: 'initialized', value: true },
        { key: 'reminderSettings', value: state.reminderSettings },
        { key: 'syncSettings', value: state.syncSettings },
      ]),
    ]);
    db.close();
  } catch {
    // localStorage mirror already written
  }
}

export function loadThemePreference(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem(LS_THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // ignore
  }
  return 'light';
}

export function saveThemePreference(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(LS_THEME_KEY, theme);
  } catch {
    // ignore
  }
}

export function toBackupPayload(state: PersistedState): KasRumahBackupPayload {
  return {
    app: 'Kas Rumah',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    transactions: state.transactions,
    budgets: state.budgets,
    recurring: state.recurring,
    groceryDraft: state.groceryDraft,
    reminderSettings: state.reminderSettings,
  };
}
