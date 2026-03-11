import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

export type Currency = "KRW" | "USD";
export type BillingCycle = "monthly" | "yearly";

export interface Category {
  id: string;
  name: string;
  isPreset: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  name: string;
  templateKey: string | null;
  amount: number;
  currency: Currency;
  billingCycle: BillingCycle;
  billingDate: string;
  trialEndDate: string | null;
  notifyDayBefore: boolean;
  categoryId: string;
  isActive: boolean;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionWithCategory extends Subscription {
  categoryName: string;
  categoryIsPreset: boolean;
  nextBillingDate: string;
}

export interface CreateCategoryInput {
  name: string;
}

export interface UpdateCategoryInput {
  name: string;
}

export interface CreateSubscriptionInput {
  name: string;
  templateKey?: string | null;
  amount: number;
  currency: Currency;
  billingCycle: BillingCycle;
  billingDate: string;
  trialEndDate?: string | null;
  notifyDayBefore?: boolean;
  categoryId: string;
  isActive?: boolean;
  memo?: string | null;
}

export interface UpdateSubscriptionInput {
  name?: string;
  templateKey?: string | null;
  amount?: number;
  currency?: Currency;
  billingCycle?: BillingCycle;
  billingDate?: string;
  trialEndDate?: string | null;
  notifyDayBefore?: boolean;
  categoryId?: string;
  isActive?: boolean;
  memo?: string | null;
}

export interface ListSubscriptionsOptions {
  categoryId?: string;
  isActive?: boolean;
}

export interface UsdKrwExchangeRate {
  baseCode: "KRW";
  targetCode: "USD";
  conversionRate: number;
  usdToKrwRate: number;
  timeLastUpdateUnix: number;
  timeLastUpdateUtc: string;
  timeNextUpdateUnix: number;
  timeNextUpdateUtc: string;
  fetchedAt: string;
}

const DATABASE_NAME = "subak.db";
const KRW_USD_EXCHANGE_RATE_URL =
  "https://v6.exchangerate-api.com/v6/e26bed7dc0ec5fb7dceb395a/pair/KRW/USD";

const PRESET_CATEGORIES: { id: string; name: string }[] = [
  { id: "cat_ott", name: "OTT" },
  { id: "cat_music", name: "음악" },
  { id: "cat_cloud", name: "클라우드" },
  { id: "cat_productivity", name: "생산성" },
  { id: "cat_finance", name: "금융" },
  { id: "cat_etc", name: "기타" },
];

let databasePromise: Promise<SQLiteDatabase> | null = null;
let initializePromise: Promise<void> | null = null;

function nowIsoString(): string {
  return new Date().toISOString();
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generateId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${random}`;
}

function isCurrency(value: string): value is Currency {
  return value === "KRW" || value === "USD";
}

function isBillingCycle(value: string): value is BillingCycle {
  return value === "monthly" || value === "yearly";
}

function assertBillingDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("billingDate must be in YYYY-MM-DD format.");
  }

  const [year, month, day] = date.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new Error("billingDate must be in YYYY-MM-DD format.");
  }

  if (month < 1 || month > 12) {
    throw new Error("billingDate month is out of range.");
  }

  const maxDay = getLastDayOfMonthUtc(year, month - 1);
  if (day < 1 || day > maxDay) {
    throw new Error("billingDate day is out of range.");
  }
}

function normalizeMemo(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function hasAtMostFractionDigits(value: number, maxFractionDigits: number): boolean {
  const factor = 10 ** maxFractionDigits;
  return Math.abs(value * factor - Math.round(value * factor)) < 1e-8;
}

function assertAmount(amount: number, currency: Currency): void {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("amount must be a non-negative number.");
  }

  if (currency === "KRW") {
    if (!Number.isInteger(amount)) {
      throw new Error("KRW amount must be a non-negative integer.");
    }

    return;
  }

  if (!hasAtMostFractionDigits(amount, 2)) {
    throw new Error("USD amount must have at most 2 decimal places.");
  }
}

function mapCategoryRow(row: {
  id: string;
  name: string;
  isPreset: number;
  createdAt: string;
  updatedAt: string;
}): Category {
  return {
    id: row.id,
    name: row.name,
    isPreset: row.isPreset === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapSubscriptionRow(row: {
  id: string;
  name: string;
  templateKey: string | null;
  amount: number;
  currency: string;
  billingCycle: string;
  billingDate: string;
  trialEndDate: string | null;
  notifyDayBefore: number;
  categoryId: string;
  isActive: number;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
  categoryName: string;
  categoryIsPreset: number;
}): SubscriptionWithCategory {
  if (!isCurrency(row.currency)) {
    throw new Error(`Unexpected currency in database: ${row.currency}`);
  }

  if (!isBillingCycle(row.billingCycle)) {
    throw new Error(`Unexpected billingCycle in database: ${row.billingCycle}`);
  }

  return {
    id: row.id,
    name: row.name,
    templateKey: row.templateKey,
    amount: row.amount,
    currency: row.currency,
    billingCycle: row.billingCycle,
    billingDate: row.billingDate,
    trialEndDate: row.trialEndDate,
    notifyDayBefore: row.notifyDayBefore === 1,
    categoryId: row.categoryId,
    isActive: row.isActive === 1,
    memo: row.memo,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    categoryName: row.categoryName,
    categoryIsPreset: row.categoryIsPreset === 1,
    nextBillingDate: calculateNextBillingDate(
      row.billingDate,
      row.billingCycle,
      row.trialEndDate,
    ),
  };
}

async function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(DATABASE_NAME);
  }

  return databasePromise;
}

async function createSchema(database: SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      isPreset INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      templateKey TEXT,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'KRW' CHECK (currency IN ('KRW', 'USD')),
      billingCycle TEXT NOT NULL CHECK (billingCycle IN ('monthly', 'yearly')),
      billingDate TEXT NOT NULL,
      trialEndDate TEXT,
      notifyDayBefore INTEGER NOT NULL DEFAULT 0,
      categoryId TEXT NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1,
      memo TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_subscriptions_category_id
      ON subscriptions(categoryId);

    CREATE INDEX IF NOT EXISTS idx_subscriptions_is_active
      ON subscriptions(isActive);

    CREATE TABLE IF NOT EXISTS exchange_rates (
      baseCode TEXT NOT NULL,
      targetCode TEXT NOT NULL,
      conversionRate REAL NOT NULL,
      timeLastUpdateUnix INTEGER NOT NULL,
      timeLastUpdateUtc TEXT NOT NULL,
      timeNextUpdateUnix INTEGER NOT NULL,
      timeNextUpdateUtc TEXT NOT NULL,
      fetchedAt TEXT NOT NULL,
      PRIMARY KEY (baseCode, targetCode)
    );
  `);
}

async function migrateTemplateKeyColumn(database: SQLiteDatabase): Promise<void> {
  try {
    await database.execAsync(`
      ALTER TABLE subscriptions
      ADD COLUMN templateKey TEXT
    `);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("duplicate column name")) {
      return;
    }

    throw error;
  }
}

async function migrateTrialEndDateColumn(database: SQLiteDatabase): Promise<void> {
  try {
    await database.execAsync(`
      ALTER TABLE subscriptions
      ADD COLUMN trialEndDate TEXT
    `);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("duplicate column name")) {
      return;
    }

    throw error;
  }
}

async function migrateNotifyDayBeforeColumn(database: SQLiteDatabase): Promise<void> {
  try {
    await database.execAsync(`
      ALTER TABLE subscriptions
      ADD COLUMN notifyDayBefore INTEGER NOT NULL DEFAULT 0
    `);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("duplicate column name")) {
      return;
    }

    throw error;
  }
}

async function seedPresetCategories(database: SQLiteDatabase): Promise<void> {
  const now = nowIsoString();

  for (const category of PRESET_CATEGORIES) {
    await database.runAsync(
      `
        INSERT OR IGNORE INTO categories (id, name, isPreset, createdAt, updatedAt)
        VALUES (?, ?, 1, ?, ?)
      `,
      [category.id, category.name, now, now],
    );
  }
}

async function ensureInitialized(): Promise<void> {
  if (!initializePromise) {
    initializePromise = (async () => {
      const database = await getDatabase();
      await createSchema(database);
      await migrateTemplateKeyColumn(database);
      await migrateTrialEndDateColumn(database);
      await migrateNotifyDayBeforeColumn(database);
      await seedPresetCategories(database);
    })().catch((error) => {
      initializePromise = null;
      throw error;
    });
  }

  return initializePromise;
}

function toIsoDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseYmdToUtcDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLastDayOfMonthUtc(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function addCycle(date: Date, cycle: BillingCycle): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  if (cycle === "monthly") {
    const targetMonth = month + 1;
    const targetYear = year + Math.floor(targetMonth / 12);
    const normalizedMonth = targetMonth % 12;
    const maxDay = getLastDayOfMonthUtc(targetYear, normalizedMonth);
    return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(day, maxDay)));
  }

  const targetYear = year + 1;
  const maxDay = getLastDayOfMonthUtc(targetYear, month);
  return new Date(Date.UTC(targetYear, month, Math.min(day, maxDay)));
}

export function isTrialActive(
  trialEndDate: string | null,
  baseDate: Date = new Date(),
): boolean {
  if (!trialEndDate) {
    return false;
  }

  assertBillingDate(trialEndDate);
  return trialEndDate >= toLocalDateString(baseDate);
}

export function listUpcomingBillingDates(
  billingDate: string,
  billingCycle: BillingCycle,
  trialEndDate: string | null,
  rangeEndDate: Date,
  rangeStartDate: Date = new Date(),
): string[] {
  const endDate = toLocalDateString(rangeEndDate);
  let nextBillingDate = calculateNextBillingDate(
    billingDate,
    billingCycle,
    trialEndDate,
    rangeStartDate,
  );
  const billingDates: string[] = [];

  while (nextBillingDate <= endDate) {
    billingDates.push(nextBillingDate);
    nextBillingDate = toIsoDateString(
      addCycle(parseYmdToUtcDate(nextBillingDate), billingCycle),
    );
  }

  return billingDates;
}

export function calculateNextBillingDate(
  billingDate: string,
  billingCycle: BillingCycle,
  trialEndDate: string | null = null,
  baseDate: Date = new Date(),
): string {
  assertBillingDate(billingDate);

  if (trialEndDate) {
    assertBillingDate(trialEndDate);
  }

  const base = new Date(
    Date.UTC(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
    ),
  );

  if (trialEndDate) {
    const [trialYear, trialMonth, trialDay] = trialEndDate.split("-").map(Number);
    const normalizedTrialDate = new Date(
      Date.UTC(trialYear, trialMonth - 1, trialDay),
    );

    if (normalizedTrialDate >= base) {
      return trialEndDate;
    }
  }

  const [year, month, day] = billingDate.split("-").map(Number);
  const maxDay = getLastDayOfMonthUtc(year, month - 1);
  const anchoredDay = Math.min(day, maxDay);

  let nextDate = new Date(Date.UTC(year, month - 1, anchoredDay));

  while (nextDate < base) {
    nextDate = addCycle(nextDate, billingCycle);
  }

  return toIsoDateString(nextDate);
}

function mapUsdKrwExchangeRateRow(row: {
  baseCode: string;
  targetCode: string;
  conversionRate: number;
  timeLastUpdateUnix: number;
  timeLastUpdateUtc: string;
  timeNextUpdateUnix: number;
  timeNextUpdateUtc: string;
  fetchedAt: string;
}): UsdKrwExchangeRate {
  if (row.baseCode !== "KRW" || row.targetCode !== "USD") {
    throw new Error("Unexpected exchange rate pair in database.");
  }

  if (row.conversionRate <= 0) {
    throw new Error("Invalid exchange rate value in database.");
  }

  return {
    baseCode: "KRW",
    targetCode: "USD",
    conversionRate: row.conversionRate,
    usdToKrwRate: 1 / row.conversionRate,
    timeLastUpdateUnix: row.timeLastUpdateUnix,
    timeLastUpdateUtc: row.timeLastUpdateUtc,
    timeNextUpdateUnix: row.timeNextUpdateUnix,
    timeNextUpdateUtc: row.timeNextUpdateUtc,
    fetchedAt: row.fetchedAt,
  };
}

async function getStoredUsdKrwRateRow() {
  await ensureInitialized();
  const database = await getDatabase();

  return database.getFirstAsync<{
    baseCode: string;
    targetCode: string;
    conversionRate: number;
    timeLastUpdateUnix: number;
    timeLastUpdateUtc: string;
    timeNextUpdateUnix: number;
    timeNextUpdateUtc: string;
    fetchedAt: string;
  }>(
    `
      SELECT
        baseCode,
        targetCode,
        conversionRate,
        timeLastUpdateUnix,
        timeLastUpdateUtc,
        timeNextUpdateUnix,
        timeNextUpdateUtc,
        fetchedAt
      FROM exchange_rates
      WHERE baseCode = 'KRW' AND targetCode = 'USD'
      LIMIT 1
    `,
  );
}

async function storeUsdKrwRate(rate: Omit<UsdKrwExchangeRate, "usdToKrwRate">) {
  await ensureInitialized();
  const database = await getDatabase();

  await database.runAsync(
    `
      INSERT OR REPLACE INTO exchange_rates (
        baseCode,
        targetCode,
        conversionRate,
        timeLastUpdateUnix,
        timeLastUpdateUtc,
        timeNextUpdateUnix,
        timeNextUpdateUtc,
        fetchedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      rate.baseCode,
      rate.targetCode,
      rate.conversionRate,
      rate.timeLastUpdateUnix,
      rate.timeLastUpdateUtc,
      rate.timeNextUpdateUnix,
      rate.timeNextUpdateUtc,
      rate.fetchedAt,
    ],
  );
}

async function fetchUsdKrwRateFromApi() {
  const response = await fetch(KRW_USD_EXCHANGE_RATE_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch exchange rate. HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    result?: unknown;
    base_code?: unknown;
    target_code?: unknown;
    conversion_rate?: unknown;
    time_last_update_unix?: unknown;
    time_last_update_utc?: unknown;
    time_next_update_unix?: unknown;
    time_next_update_utc?: unknown;
  };

  if (
    payload.result !== "success" ||
    payload.base_code !== "KRW" ||
    payload.target_code !== "USD" ||
    typeof payload.conversion_rate !== "number" ||
    payload.conversion_rate <= 0 ||
    typeof payload.time_last_update_unix !== "number" ||
    typeof payload.time_last_update_utc !== "string" ||
    typeof payload.time_next_update_unix !== "number" ||
    typeof payload.time_next_update_utc !== "string"
  ) {
    throw new Error("Received an invalid exchange rate response.");
  }

  return {
    baseCode: "KRW" as const,
    targetCode: "USD" as const,
    conversionRate: payload.conversion_rate,
    timeLastUpdateUnix: payload.time_last_update_unix,
    timeLastUpdateUtc: payload.time_last_update_utc,
    timeNextUpdateUnix: payload.time_next_update_unix,
    timeNextUpdateUtc: payload.time_next_update_utc,
    fetchedAt: nowIsoString(),
  };
}

export async function initializeSubscriptionStore(): Promise<void> {
  await ensureInitialized();
}

export async function getStoredUsdKrwRate(): Promise<UsdKrwExchangeRate | null> {
  const storedRate = await getStoredUsdKrwRateRow();
  return storedRate ? mapUsdKrwExchangeRateRow(storedRate) : null;
}

function hasFetchedOnSameLocalDate(
  fetchedAt: string,
  now: Date = new Date(),
): boolean {
  const fetchedAtDate = new Date(fetchedAt);

  if (Number.isNaN(fetchedAtDate.getTime())) {
    return false;
  }

  return toLocalDateKey(fetchedAtDate) === toLocalDateKey(now);
}

export async function getUsdKrwRate(): Promise<UsdKrwExchangeRate | null> {
  const storedRate = await getStoredUsdKrwRate();

  if (storedRate && hasFetchedOnSameLocalDate(storedRate.fetchedAt)) {
    return storedRate;
  }

  try {
    const fetchedRate = await fetchUsdKrwRateFromApi();
    await storeUsdKrwRate(fetchedRate);
    return {
      ...fetchedRate,
      usdToKrwRate: 1 / fetchedRate.conversionRate,
    };
  } catch (error) {
    console.error("Failed to refresh USD/KRW exchange rate:", error);
    return storedRate;
  }
}

export async function listCategories(): Promise<Category[]> {
  await ensureInitialized();
  const database = await getDatabase();

  const rows = await database.getAllAsync<{
    id: string;
    name: string;
    isPreset: number;
    createdAt: string;
    updatedAt: string;
  }>(
    `
      SELECT id, name, isPreset, createdAt, updatedAt
      FROM categories
      ORDER BY isPreset DESC, name COLLATE NOCASE ASC
    `,
  );

  return rows.map(mapCategoryRow);
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<Category> {
  const trimmedName = input.name.trim();
  if (trimmedName.length === 0) {
    throw new Error("Category name is required.");
  }

  await ensureInitialized();
  const database = await getDatabase();

  const now = nowIsoString();
  const id = generateId("cat");

  await database.runAsync(
    `
      INSERT INTO categories (id, name, isPreset, createdAt, updatedAt)
      VALUES (?, ?, 0, ?, ?)
    `,
    [id, trimmedName, now, now],
  );

  const row = await database.getFirstAsync<{
    id: string;
    name: string;
    isPreset: number;
    createdAt: string;
    updatedAt: string;
  }>(
    `
      SELECT id, name, isPreset, createdAt, updatedAt
      FROM categories
      WHERE id = ?
    `,
    [id],
  );

  if (!row) {
    throw new Error("Failed to create category.");
  }

  return mapCategoryRow(row);
}

export async function updateCategory(
  categoryId: string,
  input: UpdateCategoryInput,
): Promise<Category> {
  const trimmedName = input.name.trim();
  if (trimmedName.length === 0) {
    throw new Error("Category name is required.");
  }

  await ensureInitialized();
  const database = await getDatabase();

  const existing = await database.getFirstAsync<{ isPreset: number }>(
    `SELECT isPreset FROM categories WHERE id = ?`,
    [categoryId],
  );

  if (!existing) {
    throw new Error("Category not found.");
  }

  if (existing.isPreset === 1) {
    throw new Error("Preset categories cannot be renamed.");
  }

  const result = await database.runAsync(
    `
      UPDATE categories
      SET name = ?, updatedAt = ?
      WHERE id = ?
    `,
    [trimmedName, nowIsoString(), categoryId],
  );

  if (result.changes === 0) {
    throw new Error("Category not found.");
  }

  const row = await database.getFirstAsync<{
    id: string;
    name: string;
    isPreset: number;
    createdAt: string;
    updatedAt: string;
  }>(
    `
      SELECT id, name, isPreset, createdAt, updatedAt
      FROM categories
      WHERE id = ?
    `,
    [categoryId],
  );

  if (!row) {
    throw new Error("Failed to update category.");
  }

  return mapCategoryRow(row);
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await ensureInitialized();
  const database = await getDatabase();

  const existing = await database.getFirstAsync<{ isPreset: number }>(
    `SELECT isPreset FROM categories WHERE id = ?`,
    [categoryId],
  );

  if (!existing) {
    throw new Error("Category not found.");
  }

  if (existing.isPreset === 1) {
    throw new Error("Preset categories cannot be deleted.");
  }

  try {
    const result = await database.runAsync(
      `DELETE FROM categories WHERE id = ?`,
      [categoryId],
    );

    if (result.changes === 0) {
      throw new Error("Category not found.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("FOREIGN KEY constraint failed")) {
      throw new Error(
        "This category is used by a subscription. Change subscription categories first.",
      );
    }

    throw error;
  }
}

export async function createSubscription(
  input: CreateSubscriptionInput,
): Promise<SubscriptionWithCategory> {
  const trimmedName = input.name.trim();
  if (trimmedName.length === 0) {
    throw new Error("Subscription name is required.");
  }

  if (!isCurrency(input.currency)) {
    throw new Error("currency must be KRW or USD.");
  }

  assertAmount(input.amount, input.currency);

  if (!isBillingCycle(input.billingCycle)) {
    throw new Error("billingCycle must be monthly or yearly.");
  }

  assertBillingDate(input.billingDate);

  if (input.trialEndDate != null) {
    assertBillingDate(input.trialEndDate);
  }

  await ensureInitialized();
  const database = await getDatabase();

  const now = nowIsoString();
  const id = generateId("sub");

  await database.runAsync(
    `
      INSERT INTO subscriptions (
        id,
        name,
        templateKey,
        amount,
        currency,
        billingCycle,
        billingDate,
        trialEndDate,
        notifyDayBefore,
        categoryId,
        isActive,
        memo,
        createdAt,
        updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      trimmedName,
      input.templateKey ?? null,
      input.amount,
      input.currency,
      input.billingCycle,
      input.billingDate,
      input.trialEndDate ?? null,
      input.notifyDayBefore === true ? 1 : 0,
      input.categoryId,
      input.isActive === false ? 0 : 1,
      normalizeMemo(input.memo),
      now,
      now,
    ],
  );

  const created = await getSubscriptionById(id);
  if (!created) {
    throw new Error("Failed to create subscription.");
  }

  return created;
}

export async function listSubscriptions(
  options: ListSubscriptionsOptions = {},
): Promise<SubscriptionWithCategory[]> {
  await ensureInitialized();
  const database = await getDatabase();

  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (options.categoryId) {
    clauses.push("s.categoryId = ?");
    params.push(options.categoryId);
  }

  if (typeof options.isActive === "boolean") {
    clauses.push("s.isActive = ?");
    params.push(options.isActive ? 1 : 0);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

  const rows = await database.getAllAsync<{
    id: string;
    name: string;
    templateKey: string | null;
    amount: number;
    currency: string;
    billingCycle: string;
    billingDate: string;
    trialEndDate: string | null;
    notifyDayBefore: number;
    categoryId: string;
    isActive: number;
    memo: string | null;
    createdAt: string;
    updatedAt: string;
    categoryName: string;
    categoryIsPreset: number;
  }>(
    `
      SELECT
        s.id,
        s.name,
        s.templateKey,
        s.amount,
        s.currency,
        s.billingCycle,
        s.billingDate,
        s.trialEndDate,
        s.notifyDayBefore,
        s.categoryId,
        s.isActive,
        s.memo,
        s.createdAt,
        s.updatedAt,
        c.name AS categoryName,
        c.isPreset AS categoryIsPreset
      FROM subscriptions s
      INNER JOIN categories c ON c.id = s.categoryId
      ${whereClause}
      ORDER BY s.createdAt DESC
    `,
    params,
  );

  return rows.map(mapSubscriptionRow);
}

export async function getSubscriptionById(
  subscriptionId: string,
): Promise<SubscriptionWithCategory | null> {
  await ensureInitialized();
  const database = await getDatabase();

  const row = await database.getFirstAsync<{
    id: string;
    name: string;
    templateKey: string | null;
    amount: number;
    currency: string;
    billingCycle: string;
    billingDate: string;
    trialEndDate: string | null;
    notifyDayBefore: number;
    categoryId: string;
    isActive: number;
    memo: string | null;
    createdAt: string;
    updatedAt: string;
    categoryName: string;
    categoryIsPreset: number;
  }>(
    `
      SELECT
        s.id,
        s.name,
        s.templateKey,
        s.amount,
        s.currency,
        s.billingCycle,
        s.billingDate,
        s.trialEndDate,
        s.notifyDayBefore,
        s.categoryId,
        s.isActive,
        s.memo,
        s.createdAt,
        s.updatedAt,
        c.name AS categoryName,
        c.isPreset AS categoryIsPreset
      FROM subscriptions s
      INNER JOIN categories c ON c.id = s.categoryId
      WHERE s.id = ?
      LIMIT 1
    `,
    [subscriptionId],
  );

  return row ? mapSubscriptionRow(row) : null;
}

export async function updateSubscription(
  subscriptionId: string,
  input: UpdateSubscriptionInput,
): Promise<SubscriptionWithCategory> {
  await ensureInitialized();
  const database = await getDatabase();
  let amountCurrency = input.currency;

  if (input.amount !== undefined && amountCurrency === undefined) {
    const existing = await getSubscriptionById(subscriptionId);
    if (!existing) {
      throw new Error("Subscription not found.");
    }

    amountCurrency = existing.currency;
  }

  const sets: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.name !== undefined) {
    const trimmedName = input.name.trim();
    if (trimmedName.length === 0) {
      throw new Error("Subscription name is required.");
    }
    sets.push("name = ?");
    params.push(trimmedName);
  }

  if (input.templateKey !== undefined) {
    sets.push("templateKey = ?");
    params.push(input.templateKey);
  }

  if (input.amount !== undefined) {
    assertAmount(input.amount, amountCurrency ?? "KRW");
    sets.push("amount = ?");
    params.push(input.amount);
  }

  if (input.currency !== undefined) {
    if (!isCurrency(input.currency)) {
      throw new Error("currency must be KRW or USD.");
    }
    sets.push("currency = ?");
    params.push(input.currency);
  }

  if (input.billingCycle !== undefined) {
    if (!isBillingCycle(input.billingCycle)) {
      throw new Error("billingCycle must be monthly or yearly.");
    }
    sets.push("billingCycle = ?");
    params.push(input.billingCycle);
  }

  if (input.billingDate !== undefined) {
    assertBillingDate(input.billingDate);
    sets.push("billingDate = ?");
    params.push(input.billingDate);
  }

  if (input.trialEndDate !== undefined) {
    if (input.trialEndDate !== null) {
      assertBillingDate(input.trialEndDate);
    }

    sets.push("trialEndDate = ?");
    params.push(input.trialEndDate);
  }

  if (input.notifyDayBefore !== undefined) {
    sets.push("notifyDayBefore = ?");
    params.push(input.notifyDayBefore ? 1 : 0);
  }

  if (input.categoryId !== undefined) {
    sets.push("categoryId = ?");
    params.push(input.categoryId);
  }

  if (input.isActive !== undefined) {
    sets.push("isActive = ?");
    params.push(input.isActive ? 1 : 0);
  }

  if (input.memo !== undefined) {
    sets.push("memo = ?");
    params.push(normalizeMemo(input.memo));
  }

  if (sets.length === 0) {
    const existing = await getSubscriptionById(subscriptionId);
    if (!existing) {
      throw new Error("Subscription not found.");
    }
    return existing;
  }

  sets.push("updatedAt = ?");
  params.push(nowIsoString());
  params.push(subscriptionId);

  const result = await database.runAsync(
    `
      UPDATE subscriptions
      SET ${sets.join(", ")}
      WHERE id = ?
    `,
    params,
  );

  if (result.changes === 0) {
    throw new Error("Subscription not found.");
  }

  const updated = await getSubscriptionById(subscriptionId);
  if (!updated) {
    throw new Error("Failed to load updated subscription.");
  }

  return updated;
}

export async function deleteSubscription(subscriptionId: string): Promise<void> {
  await ensureInitialized();
  const database = await getDatabase();

  const result = await database.runAsync(
    `DELETE FROM subscriptions WHERE id = ?`,
    [subscriptionId],
  );

  if (result.changes === 0) {
    throw new Error("Subscription not found.");
  }
}
