import type {
  CategoryBudget,
  CategoryId,
  CategoryMeta,
  ExpenseCategoryId,
  GroceryDraftItem,
  IncomeCategoryId,
  RecurringExpense,
  Transaction,
  TransactionType,
} from '../types/finance';

export const EXPENSE_CATEGORIES: Record<ExpenseCategoryId, CategoryMeta> = {
  belanja_dapur: {
    id: 'belanja_dapur',
    type: 'expense',
    label: 'Belanja Dapur & Lauk',
    shortLabel: 'Dapur',
    description: 'Sayur, buah, lauk pauk, daging, ikan, tempe, tahu',
    color: '#0F766E',
  },
  bumbu_masak: {
    id: 'bumbu_masak',
    type: 'expense',
    label: 'Bumbu Masak',
    shortLabel: 'Bumbu',
    description: 'Bawang, cabai, rempah, kecap, garam, kaldu, saus',
    color: '#B45309',
  },
  kebutuhan_pokok: {
    id: 'kebutuhan_pokok',
    type: 'expense',
    label: 'Kebutuhan Pokok',
    shortLabel: 'Pokok',
    description: 'Beras, minyak goreng, gula, telur, sabun, galon, gas',
    color: '#0E7490',
  },
  belanja_online: {
    id: 'belanja_online',
    type: 'expense',
    label: 'Belanja Online',
    shortLabel: 'Online',
    description: 'Marketplace, ongkir, perlengkapan rumah tangga online',
    color: '#4338CA',
  },
  tak_terduga: {
    id: 'tak_terduga',
    type: 'expense',
    label: 'Tak Terduga',
    shortLabel: 'Darurat',
    description: 'Obat mendadak, servis alat rumah/kendaraan, kondangan',
    color: '#BE123C',
  },
  tetap_mingguan: {
    id: 'tetap_mingguan',
    type: 'expense',
    label: 'Tetap Mingguan',
    shortLabel: 'Mingguan',
    description: 'Uang jajan sekolah, bensin mingguan, laundry, pasar rutin',
    color: '#047857',
  },
  tetap_bulanan: {
    id: 'tetap_bulanan',
    type: 'expense',
    label: 'Tetap Bulanan',
    shortLabel: 'Bulanan',
    description: 'Listrik PLN, air PDAM, WiFi, cicilan, iuran RT, SPP',
    color: '#334155',
  },
};

export const INCOME_CATEGORIES: Record<IncomeCategoryId, CategoryMeta> = {
  gaji: {
    id: 'gaji',
    type: 'income',
    label: 'Gaji & Tunjangan',
    shortLabel: 'Gaji',
    description: 'Penghasilan bulanan tetap atau THR',
    color: '#0F766E',
  },
  uang_belanja: {
    id: 'uang_belanja',
    type: 'income',
    label: 'Uang Belanja Rumah',
    shortLabel: 'Kas Keluarga',
    description: 'Setoran kas harian/mingguan dari pasangan atau keluarga',
    color: '#0D9488',
  },
  usaha: {
    id: 'usaha',
    type: 'income',
    label: 'Usaha & Sampingan',
    shortLabel: 'Usaha',
    description: 'Hasil jualan, freelance, komisi',
    color: '#0369A1',
  },
  lainnya: {
    id: 'lainnya',
    type: 'income',
    label: 'Pemasukan Lainnya',
    shortLabel: 'Lainnya',
    description: 'Bonus, cashback, pengembalian dana, hadiah',
    color: '#475569',
  },
};

export const ALL_CATEGORIES: Record<CategoryId, CategoryMeta> = {
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES,
};

export interface SmartCatalogEntry {
  keywords: string[];
  name: string;
  category: CategoryId;
  type: TransactionType;
  estimatedPrice: number;
  defaultUnit: string;
}

export const SMART_CATALOG: SmartCatalogEntry[] = [
  // Belanja Dapur & Lauk
  { keywords: ['ayam', 'daging ayam', 'dada ayam', 'paha ayam'], name: 'Daging Ayam', category: 'belanja_dapur', type: 'expense', estimatedPrice: 38000, defaultUnit: 'kg' },
  { keywords: ['daging sapi', 'sapi', 'rendang'], name: 'Daging Sapi', category: 'belanja_dapur', type: 'expense', estimatedPrice: 135000, defaultUnit: 'kg' },
  { keywords: ['ikan', 'lele', 'nila', 'tongkol', 'kembung', 'salmon', 'udang', 'cumi'], name: 'Ikan / Seafood Segar', category: 'belanja_dapur', type: 'expense', estimatedPrice: 35000, defaultUnit: 'kg' },
  { keywords: ['tempe'], name: 'Tempe Papan', category: 'belanja_dapur', type: 'expense', estimatedPrice: 6000, defaultUnit: 'pcs' },
  { keywords: ['tahu'], name: 'Tahu Putih / Kuning', category: 'belanja_dapur', type: 'expense', estimatedPrice: 7000, defaultUnit: 'bungkus' },
  { keywords: ['bayam', 'kangkung', 'sawi', 'pakcoy', 'daun singkong', 'sayur'], name: 'Sayuran Hijau', category: 'belanja_dapur', type: 'expense', estimatedPrice: 5000, defaultUnit: 'ikat' },
  { keywords: ['wortel', 'kentang', 'kol', 'kubis', 'brokoli', 'buncis', 'terong', 'labu'], name: 'Sayur Potong', category: 'belanja_dapur', type: 'expense', estimatedPrice: 14000, defaultUnit: 'kg' },
  { keywords: ['tomat'], name: 'Tomat Segar', category: 'belanja_dapur', type: 'expense', estimatedPrice: 15000, defaultUnit: 'kg' },
  { keywords: ['pisang', 'jeruk', 'apel', 'pepaya', 'semangka', 'buah', 'alpukat'], name: 'Buah-buahan', category: 'belanja_dapur', type: 'expense', estimatedPrice: 25000, defaultUnit: 'kg' },
  { keywords: ['bakso', 'sosis', 'nugget'], name: 'Lauk Beku / Olahan', category: 'belanja_dapur', type: 'expense', estimatedPrice: 28000, defaultUnit: 'bungkus' },

  // Bumbu Masak
  { keywords: ['bawang merah', 'brambang'], name: 'Bawang Merah', category: 'bumbu_masak', type: 'expense', estimatedPrice: 44000, defaultUnit: 'kg' },
  { keywords: ['bawang putih'], name: 'Bawang Putih', category: 'bumbu_masak', type: 'expense', estimatedPrice: 42000, defaultUnit: 'kg' },
  { keywords: ['bawang bombai', 'bombay'], name: 'Bawang Bombai', category: 'bumbu_masak', type: 'expense', estimatedPrice: 18000, defaultUnit: 'kg' },
  { keywords: ['cabai', 'cabe', 'rawit', 'keriting'], name: 'Cabai Rawit / Keriting', category: 'bumbu_masak', type: 'expense', estimatedPrice: 56000, defaultUnit: 'kg' },
  { keywords: ['kunyit', 'jahe', 'lengkuas', 'laos', 'kencur', 'serai', 'sereh', 'daun salam', 'daun jeruk', 'empon'], name: 'Rempah & Bumbu Dapur', category: 'bumbu_masak', type: 'expense', estimatedPrice: 6000, defaultUnit: 'paket' },
  { keywords: ['ketumbar', 'merica', 'lada', 'kemiri', 'jintan', 'pala', 'cengkeh', 'kayu manis'], name: 'Bumbu Rempah Kering', category: 'bumbu_masak', type: 'expense', estimatedPrice: 8000, defaultUnit: 'bungkus' },
  { keywords: ['kecap'], name: 'Kecap Manis', category: 'bumbu_masak', type: 'expense', estimatedPrice: 23000, defaultUnit: 'botol' },
  { keywords: ['saus', 'saos', 'sambal botol', 'tiram'], name: 'Saus / Sambal Botol', category: 'bumbu_masak', type: 'expense', estimatedPrice: 16000, defaultUnit: 'botol' },
  { keywords: ['garam'], name: 'Garam Dapur Beryodium', category: 'bumbu_masak', type: 'expense', estimatedPrice: 5000, defaultUnit: 'bungkus' },
  { keywords: ['kaldu', 'royco', 'masako', 'penyedap', 'micin', 'totole'], name: 'Kaldu & Penyedap', category: 'bumbu_masak', type: 'expense', estimatedPrice: 10000, defaultUnit: 'renteng' },
  { keywords: ['santan', 'kara'], name: 'Santan Kemasan', category: 'bumbu_masak', type: 'expense', estimatedPrice: 4500, defaultUnit: 'pcs' },
  { keywords: ['terasi', 'asam jawa', 'bumbu racik', 'bumbu instan', 'bumbu'], name: 'Bumbu Masak Lainnya', category: 'bumbu_masak', type: 'expense', estimatedPrice: 7000, defaultUnit: 'pcs' },

  // Kebutuhan Pokok & Sembako
  { keywords: ['beras'], name: 'Beras Premium (5kg)', category: 'kebutuhan_pokok', type: 'expense', estimatedPrice: 75000, defaultUnit: 'karung' },
  { keywords: ['minyak goreng', 'minyak'], name: 'Minyak Goreng (2L)', category: 'kebutuhan_pokok', type: 'expense', estimatedPrice: 36000, defaultUnit: 'pouch' },
  { keywords: ['telur', 'telor'], name: 'Telur Ayam Negeri', category: 'kebutuhan_pokok', type: 'expense', estimatedPrice: 29000, defaultUnit: 'kg' },
  { keywords: ['gula pasir', 'gula merah', 'gula'], name: 'Gula Pasir', category: 'kebutuhan_pokok', type: 'expense', estimatedPrice: 18000, defaultUnit: 'kg' },
  { keywords: ['tepung', 'terigu'], name: 'Tepung Terigu', category: 'kebutuhan_pokok', type: 'expense', estimatedPrice: 13000, defaultUnit: 'kg' },
  { keywords: ['mie instan', 'indomie', 'mie'], name: 'Mie Instan', category: 'kebutuhan_pokok', type: 'expense', estimatedPrice: 16000, defaultUnit: '5 pcs' },
  { keywords: ['kopi', 'teh', 'susu', 'uht'], name: 'Kopi / Teh / Susu', category: 'kebutuhan_pokok', type: 'expense', estimatedPrice: 24000, defaultUnit: 'paket' },
  { keywords: ['gas', 'elpiji', 'lpg'], name: 'Gas Elpiji 3 kg', category: 'kebutuhan_pokok', type: 'expense', estimatedPrice: 22000, defaultUnit: 'tabung' },
  { keywords: ['galon', 'aqua', 'air mineral'], name: 'Air Minum Galon', category: 'kebutuhan_pokok', type: 'expense', estimatedPrice: 21000, defaultUnit: 'galon' },
  { keywords: ['sabun', 'shampo', 'pasta gigi', 'odol', 'deterjen', 'pewangi', 'tisu', 'sunlight', 'popok', 'pampers'], name: 'Kebutuhan Mandi & Cuci', category: 'kebutuhan_pokok', type: 'expense', estimatedPrice: 32000, defaultUnit: 'paket' },

  // Belanja Online
  { keywords: ['shopee', 'tokopedia', 'lazada', 'tiktok shop', 'blibli', 'online', 'paket cod', 'ongkir', 'marketplace'], name: 'Belanja Marketplace Online', category: 'belanja_online', type: 'expense', estimatedPrice: 85000, defaultUnit: 'transaksi' },

  // Pengeluaran Tak Terduga
  { keywords: ['obat', 'apotek', 'dokter', 'klinik', 'puskesmas', 'vitamin'], name: 'Kesehatan & Obat Mendadak', category: 'tak_terduga', type: 'expense', estimatedPrice: 75000, defaultUnit: 'kali' },
  { keywords: ['servis', 'service', 'tambal', 'ban', 'bocor', 'tukang', 'perbaikan', 'rusak', 'darurat'], name: 'Perbaikan / Servis Mendadak', category: 'tak_terduga', type: 'expense', estimatedPrice: 120000, defaultUnit: 'kali' },
  { keywords: ['kondangan', 'sumbangan', 'takziah', 'hadiah', 'kado'], name: 'Kondangan & Sosial', category: 'tak_terduga', type: 'expense', estimatedPrice: 100000, defaultUnit: 'kali' },

  // Tetap Mingguan
  { keywords: ['jajan', 'saku', 'sekolah mingguan'], name: 'Uang Saku Mingguan', category: 'tetap_mingguan', type: 'expense', estimatedPrice: 75000, defaultUnit: 'minggu' },
  { keywords: ['bensin', 'pertalite', 'pertamax', 'bbm'], name: 'BBM Kendaraan Mingguan', category: 'tetap_mingguan', type: 'expense', estimatedPrice: 50000, defaultUnit: 'minggu' },
  { keywords: ['laundry', 'setrika'], name: 'Laundry Mingguan', category: 'tetap_mingguan', type: 'expense', estimatedPrice: 35000, defaultUnit: 'minggu' },

  // Tetap Bulanan
  { keywords: ['listrik', 'pln', 'token'], name: 'Listrik PLN / Token', category: 'tetap_bulanan', type: 'expense', estimatedPrice: 250000, defaultUnit: 'bulan' },
  { keywords: ['pdam', 'air bersih', 'pam'], name: 'Tagihan Air PDAM', category: 'tetap_bulanan', type: 'expense', estimatedPrice: 95000, defaultUnit: 'bulan' },
  { keywords: ['wifi', 'internet', 'indihome', 'biznet', 'myrepublic', 'paket data', 'pulsa'], name: 'Internet & Komunikasi', category: 'tetap_bulanan', type: 'expense', estimatedPrice: 320000, defaultUnit: 'bulan' },
  { keywords: ['kontrakan', 'sewa rumah', 'cicilan', 'kpr'], name: 'Cicilan / Kontrakan Rumah', category: 'tetap_bulanan', type: 'expense', estimatedPrice: 1500000, defaultUnit: 'bulan' },
  { keywords: ['iuran', 'sampah', 'keamanan', 'rt', 'rw', 'ipl'], name: 'Iuran Lingkungan & Sampah', category: 'tetap_bulanan', type: 'expense', estimatedPrice: 60000, defaultUnit: 'bulan' },
  { keywords: ['spp', 'uang sekolah', 'les'], name: 'Pendidikan / SPP Bulanan', category: 'tetap_bulanan', type: 'expense', estimatedPrice: 450000, defaultUnit: 'bulan' },

  // Uang Masuk
  { keywords: ['gaji', 'gajian', 'tunjangan', 'thr'], name: 'Gaji Bulanan', category: 'gaji', type: 'income', estimatedPrice: 6500000, defaultUnit: 'bulan' },
  { keywords: ['uang belanja', 'jatah belanja', 'transfer suami', 'transfer istri', 'kas rumah'], name: 'Uang Belanja Rumah Tangga', category: 'uang_belanja', type: 'income', estimatedPrice: 2000000, defaultUnit: 'kali' },
  { keywords: ['jualan', 'omzet', 'freelance', 'proyek', 'usaha', 'komisi'], name: 'Hasil Usaha / Sampingan', category: 'usaha', type: 'income', estimatedPrice: 500000, defaultUnit: 'kali' },
  { keywords: ['bonus', 'cashback', 'refund', 'hadiah masuk'], name: 'Pemasukan Tambahan', category: 'lainnya', type: 'income', estimatedPrice: 200000, defaultUnit: 'kali' },
];

export interface SmartDetectionResult {
  category: CategoryId;
  type: TransactionType;
  estimatedPrice: number;
  matchedLabel: string;
  source: 'history' | 'catalog';
  unitHint: string;
}

function parseQuantityMultiplier(text: string): number {
  const lower = text.toLowerCase();
  if (/(1\/2|0[.,]5|setengah)\s*(kg|kilo|liter|l)?/.test(lower)) return 0.5;
  if (/(1\/4|0[.,]25|seperempat)\s*(kg|kilo)?/.test(lower)) return 0.25;
  const match = lower.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilo|ikat|pcs|buah|botol|tabung|galon|pouch|bungkus|karung|liter|l|x)\b/);
  if (match) {
    const qty = parseFloat(match[1].replace(',', '.'));
    if (!Number.isNaN(qty) && qty > 0 && qty <= 50) {
      // Beras 5kg already priced for 5kg
      if (lower.includes('beras') && qty === 5) return 1;
      // Minyak 2L already priced for 2L
      if (lower.includes('minyak') && qty === 2) return 1;
      return qty;
    }
  }
  return 1;
}

export function detectSmartCategoryAndPrice(
  query: string,
  history: Transaction[] = [],
  preferredType?: TransactionType
): SmartDetectionResult | null {
  const clean = query.trim().toLowerCase();
  if (clean.length < 2) return null;

  // 1. Check user's recent history for exact or partial title match
  const matchedHistory = history.find((tx) => {
    if (preferredType && tx.type !== preferredType) return false;
    const t = tx.title.toLowerCase();
    return t === clean || (clean.length >= 4 && (t.includes(clean) || clean.includes(t)));
  });

  if (matchedHistory) {
    return {
      category: matchedHistory.category,
      type: matchedHistory.type,
      estimatedPrice: matchedHistory.amount,
      matchedLabel: `Riwayat: ${matchedHistory.title}`,
      source: 'history',
      unitHint: 'riwayat',
    };
  }

  // 2. Match against SMART_CATALOG sorted by longest keyword first for accuracy (e.g. "bawang merah" before "bawang")
  let bestMatch: { entry: SmartCatalogEntry; kwLen: number } | null = null;
  for (const entry of SMART_CATALOG) {
    if (preferredType && entry.type !== preferredType) continue;
    for (const kw of entry.keywords) {
      if (clean.includes(kw)) {
        if (!bestMatch || kw.length > bestMatch.kwLen) {
          bestMatch = { entry, kwLen: kw.length };
        }
      }
    }
  }

  if (!bestMatch) return null;

  const mult = parseQuantityMultiplier(clean);
  const roundedPrice = Math.max(1000, Math.round((bestMatch.entry.estimatedPrice * mult) / 500) * 500);

  return {
    category: bestMatch.entry.category,
    type: bestMatch.entry.type,
    estimatedPrice: roundedPrice,
    matchedLabel: bestMatch.entry.name,
    source: 'catalog',
    unitHint: bestMatch.entry.defaultUnit,
  };
}

export const DEFAULT_BUDGETS: CategoryBudget[] = [
  { category: 'belanja_dapur', monthlyLimit: 1500000 },
  { category: 'bumbu_masak', monthlyLimit: 400000 },
  { category: 'kebutuhan_pokok', monthlyLimit: 1100000 },
  { category: 'belanja_online', monthlyLimit: 500000 },
  { category: 'tak_terduga', monthlyLimit: 500000 },
  { category: 'tetap_mingguan', monthlyLimit: 800000 },
  { category: 'tetap_bulanan', monthlyLimit: 2200000 },
];

export function buildInitialSeedData(todayISO: string): {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  recurring: RecurringExpense[];
  groceryDraft: GroceryDraftItem[];
} {
  const [year, month, dayStr] = todayISO.split('-');
  const day = Math.min(28, Math.max(1, parseInt(dayStr, 10) || 15));
  const d = (offset: number) => {
    const targetDay = Math.max(1, day - offset);
    return `${year}-${month}-${String(targetDay).padStart(2, '0')}`;
  };
  const now = new Date().toISOString();

  const transactions: Transaction[] = [
    {
      id: 'seed-inc-1',
      type: 'income',
      category: 'gaji',
      title: 'Gaji Bulanan Rumah Tangga',
      amount: 7500000,
      date: `${year}-${month}-01`,
      notes: 'Pemasukan utama bulan ini',
      source: 'manual',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-inc-2',
      type: 'income',
      category: 'usaha',
      title: 'Hasil Usaha Kue & Pesanan',
      amount: 950000,
      date: d(4),
      notes: 'Pesanan akhir pekan',
      source: 'manual',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-exp-1',
      type: 'expense',
      category: 'tetap_bulanan',
      title: 'Token Listrik PLN & PDAM',
      amount: 345000,
      date: `${year}-${month}-02`,
      notes: 'Tagihan utilitas rumah',
      source: 'recurring',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-exp-2',
      type: 'expense',
      category: 'tetap_bulanan',
      title: 'Internet WiFi Rumah',
      amount: 320000,
      date: `${year}-${month}-05`,
      source: 'recurring',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-exp-3',
      type: 'expense',
      category: 'kebutuhan_pokok',
      title: 'Beras 5kg, Minyak 2L & Telur 2kg',
      amount: 169000,
      date: d(6),
      estimatedPrice: 169000,
      source: 'grocery_list',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-exp-4',
      type: 'expense',
      category: 'bumbu_masak',
      title: 'Bawang Merah 1/2kg, Putih 1/2kg, Cabai Rawit',
      amount: 61000,
      date: d(5),
      estimatedPrice: 60000,
      source: 'grocery_list',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-exp-5',
      type: 'expense',
      category: 'belanja_dapur',
      title: 'Ayam 1kg, Ikan Nila, Sayur Bayam & Tempe',
      amount: 92000,
      date: d(3),
      estimatedPrice: 90000,
      source: 'manual',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-exp-6',
      type: 'expense',
      category: 'tetap_mingguan',
      title: 'Bensin Motor & Uang Saku Mingguan',
      amount: 125000,
      date: d(2),
      source: 'recurring',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-exp-7',
      type: 'expense',
      category: 'belanja_online',
      title: 'Shopee — Deterjen, Sabun Mandi & Tisu',
      amount: 118000,
      date: d(2),
      notes: 'Promo gratis ongkir bulanan',
      source: 'manual',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-exp-8',
      type: 'expense',
      category: 'tak_terduga',
      title: 'Obat Batuk Anak & Tambal Ban',
      amount: 85000,
      date: d(1),
      notes: 'Keperluan mendadak sore hari',
      source: 'manual',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-exp-9',
      type: 'expense',
      category: 'belanja_dapur',
      title: 'Sayur Sop, Wortel, Tahu & Buah Pisang',
      amount: 54000,
      date: todayISO,
      estimatedPrice: 52000,
      source: 'manual',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const recurring: RecurringExpense[] = [
    {
      id: 'rec-1',
      title: 'Uang Saku & Bensin Mingguan',
      category: 'tetap_mingguan',
      amount: 125000,
      frequency: 'weekly',
      dayOfWeek: 1, // Senin
      lastPaidDate: d(2),
      active: true,
      notes: 'Dibayar tiap awal pekan',
    },
    {
      id: 'rec-2',
      title: 'Gas Elpiji 3kg & Air Galon',
      category: 'tetap_mingguan',
      amount: 43000,
      frequency: 'weekly',
      dayOfWeek: 5, // Jumat
      active: true,
      notes: 'Isi ulang rutin akhir pekan',
    },
    {
      id: 'rec-3',
      title: 'Listrik PLN & Air PDAM',
      category: 'tetap_bulanan',
      amount: 345000,
      frequency: 'monthly',
      dayOfMonth: 2,
      lastPaidDate: `${year}-${month}-02`,
      active: true,
    },
    {
      id: 'rec-4',
      title: 'Internet WiFi Rumah',
      category: 'tetap_bulanan',
      amount: 320000,
      frequency: 'monthly',
      dayOfMonth: 5,
      lastPaidDate: `${year}-${month}-05`,
      active: true,
    },
    {
      id: 'rec-5',
      title: 'Iuran Keamanan & Sampah RT',
      category: 'tetap_bulanan',
      amount: 60000,
      frequency: 'monthly',
      dayOfMonth: 20,
      active: true,
    },
  ];

  const groceryDraft: GroceryDraftItem[] = [
    {
      id: 'groc-1',
      name: 'Bawang Merah',
      quantity: 0.5,
      unit: 'kg',
      estimatedUnitPrice: 44000,
      category: 'bumbu_masak',
      checked: false,
    },
    {
      id: 'groc-2',
      name: 'Cabai Rawit Merah',
      quantity: 0.25,
      unit: 'kg',
      estimatedUnitPrice: 56000,
      category: 'bumbu_masak',
      checked: false,
    },
    {
      id: 'groc-3',
      name: 'Daging Ayam Potong',
      quantity: 1,
      unit: 'kg',
      estimatedUnitPrice: 38000,
      category: 'belanja_dapur',
      checked: false,
    },
    {
      id: 'groc-4',
      name: 'Minyak Goreng 2L',
      quantity: 1,
      unit: 'pouch',
      estimatedUnitPrice: 36000,
      category: 'kebutuhan_pokok',
      checked: false,
    },
  ];

  return {
    transactions,
    budgets: DEFAULT_BUDGETS,
    recurring,
    groceryDraft,
  };
}
