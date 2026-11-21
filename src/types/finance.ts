export type TransactionType = 'income' | 'expense';

export type ExpenseCategoryId =
  | 'belanja_dapur'
  | 'bumbu_masak'
  | 'kebutuhan_pokok'
  | 'belanja_online'
  | 'tak_terduga'
  | 'tetap_mingguan'
  | 'tetap_bulanan';

export type IncomeCategoryId =
  | 'gaji'
  | 'usaha'
  | 'uang_belanja'
  | 'lainnya';

export type CategoryId = ExpenseCategoryId | IncomeCategoryId;

export interface CategoryMeta {
  id: CategoryId;
  type: TransactionType;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  category: CategoryId;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  estimatedPrice?: number;
  source: 'manual' | 'grocery_list' | 'recurring';
  createdAt: string;
  updatedAt: string;
}

export interface CategoryBudget {
  category: ExpenseCategoryId;
  monthlyLimit: number;
}

export interface RecurringExpense {
  id: string;
  title: string;
  category: 'tetap_mingguan' | 'tetap_bulanan';
  amount: number;
  frequency: 'weekly' | 'monthly';
  dayOfWeek?: number; // 0 (Minggu) - 6 (Sabtu)
  dayOfMonth?: number; // 1 - 31
  lastPaidDate?: string; // YYYY-MM-DD
  active: boolean;
  notes?: string;
}

export interface GroceryDraftItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
  category: 'belanja_dapur' | 'bumbu_masak' | 'kebutuhan_pokok';
  checked: boolean;
}

export interface ReminderSettings {
  enabled: boolean;
  time: string; // HH:mm
  lastNotifiedDate?: string;
}

export interface SyncSettings {
  autoSyncEnabled: boolean;
  lastSyncedAt?: string;
  driveFileId?: string;
  driveFileName: string;
  hasPendingChanges: boolean;
  lastError?: string;
}

export interface KasRumahBackupPayload {
  app: 'Kas Rumah';
  schemaVersion: number;
  exportedAt: string;
  transactions: Transaction[];
  budgets: CategoryBudget[];
  recurring: RecurringExpense[];
  groceryDraft: GroceryDraftItem[];
  reminderSettings: ReminderSettings;
}
