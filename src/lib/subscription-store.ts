import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

export type Currency = "KRW";
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
  currency?: Currency;
  billingCycle: BillingCycle;
  billingDate: string;
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
  notifyDayBefore?: boolean;
  categoryId?: string;
  isActive?: boolean;
  memo?: string | null;
}

export interface ListSubscriptionsOptions {
  categoryId?: string;
  isActive?: boolean;
}

export type PaymentLogStatus = "paid" | "scheduled";

export interface SubscriptionPaymentLog {
  id: string;
  subscriptionId: string;
  subscriptionName: string;
  subscriptionTemplateKey: string | null;
  subscriptionIsActive: boolean;
  billingDate: string;
  status: PaymentLogStatus;
  amount: number;
  currency: Currency;
  categoryIdSnapshot: string;
  categoryNameSnapshot: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListSubscriptionPaymentLogsOptions {
  subscriptionId?: string;
  status?: PaymentLogStatus;
  dateFrom?: string;
  dateTo?: string;
  isActiveSubscription?: boolean;
  limit?: number;
  sortDirection?: "asc" | "desc";
}

const DATABASE_NAME = "moss.db";
const PAYMENT_LOG_FUTURE_MONTH_RANGE = 12;

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
let paymentLogSyncPromise: Promise<void> | null = null;

function nowIsoString(): string {
  return new Date().toISOString();
}

function generateId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${random}`;
}

function isCurrency(value: string): value is Currency {
  return value === "KRW";
}

function isBillingCycle(value: string): value is BillingCycle {
  return value === "monthly" || value === "yearly";
}

function isPaymentLogStatus(value: string): value is PaymentLogStatus {
  return value === "paid" || value === "scheduled";
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

function assertAmount(amount: number, _currency: Currency = "KRW"): void {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("amount must be a non-negative number.");
  }

  if (!Number.isInteger(amount)) {
    throw new Error("KRW amount must be a non-negative integer.");
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
    notifyDayBefore: row.notifyDayBefore === 1,
    categoryId: row.categoryId,
    isActive: row.isActive === 1,
    memo: row.memo,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    categoryName: row.categoryName,
    categoryIsPreset: row.categoryIsPreset === 1,
    nextBillingDate: calculateNextBillingDate(row.billingDate, row.billingCycle),
  };
}

function mapPaymentLogRow(row: {
  id: string;
  subscriptionId: string;
  subscriptionName: string;
  subscriptionTemplateKey: string | null;
  subscriptionIsActive: number;
  billingDate: string;
  status: string;
  amount: number;
  currency: string;
  categoryIdSnapshot: string;
  categoryNameSnapshot: string;
  createdAt: string;
  updatedAt: string;
}): SubscriptionPaymentLog {
  if (!isCurrency(row.currency)) {
    throw new Error(`Unexpected currency in payment log: ${row.currency}`);
  }

  if (!isPaymentLogStatus(row.status)) {
    throw new Error(`Unexpected payment log status: ${row.status}`);
  }

  return {
    id: row.id,
    subscriptionId: row.subscriptionId,
    subscriptionName: row.subscriptionName,
    subscriptionTemplateKey: row.subscriptionTemplateKey,
    subscriptionIsActive: row.subscriptionIsActive === 1,
    billingDate: row.billingDate,
    status: row.status,
    amount: row.amount,
    currency: row.currency,
    categoryIdSnapshot: row.categoryIdSnapshot,
    categoryNameSnapshot: row.categoryNameSnapshot,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
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
      currency TEXT NOT NULL DEFAULT 'KRW' CHECK (currency IN ('KRW')),
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

    CREATE TABLE IF NOT EXISTS subscription_payment_logs (
      id TEXT PRIMARY KEY NOT NULL,
      subscriptionId TEXT NOT NULL,
      billingDate TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('paid', 'scheduled')),
      amount REAL NOT NULL,
      currency TEXT NOT NULL CHECK (currency IN ('KRW')),
      categoryIdSnapshot TEXT NOT NULL,
      categoryNameSnapshot TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE (subscriptionId, billingDate),
      FOREIGN KEY (subscriptionId) REFERENCES subscriptions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_payment_logs_subscription_date
      ON subscription_payment_logs(subscriptionId, billingDate);

    CREATE INDEX IF NOT EXISTS idx_payment_logs_date_status
      ON subscription_payment_logs(billingDate, status);
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

async function removeUsdData(database: SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA foreign_keys = ON;
    DELETE FROM subscription_payment_logs WHERE currency = 'USD';
    DELETE FROM subscriptions WHERE currency = 'USD';
    DROP TABLE IF EXISTS exchange_rates;
  `);
}

async function removeTrialSubscriptions(database: SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA foreign_keys = ON;
    DELETE FROM subscriptions WHERE trialEndDate IS NOT NULL;
  `);
}

async function ensureInitialized(): Promise<void> {
  if (!initializePromise) {
    initializePromise = (async () => {
      const database = await getDatabase();
      await createSchema(database);
      await migrateTemplateKeyColumn(database);
      await migrateTrialEndDateColumn(database);
      await migrateNotifyDayBeforeColumn(database);
      await removeUsdData(database);
      await removeTrialSubscriptions(database);
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

function parseYmdToLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getPaymentLogRangeEndDate(baseDate: Date = new Date()): Date {
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth() + PAYMENT_LOG_FUTURE_MONTH_RANGE + 1,
    0,
  );
}

function getTodayDateKey(baseDate: Date = new Date()): string {
  return toLocalDateString(baseDate);
}

function getExpectedPaymentLogDates(
  subscription: SubscriptionWithCategory,
  baseDate: Date = new Date(),
): string[] {
  const rangeStartDate = parseYmdToLocalDate(subscription.billingDate);
  const rangeEndDate = getPaymentLogRangeEndDate(baseDate);
  const todayDateKey = getTodayDateKey(baseDate);

  return listUpcomingBillingDates(
    subscription.billingDate,
    subscription.billingCycle,
    rangeEndDate,
    rangeStartDate,
  ).filter(
    (billingDate) => subscription.isActive || billingDate < todayDateKey,
  );
}

export function listUpcomingBillingDates(
  billingDate: string,
  billingCycle: BillingCycle,
  rangeEndDate: Date,
  rangeStartDate: Date = new Date(),
): string[] {
  const endDate = toLocalDateString(rangeEndDate);
  let nextBillingDate = calculateNextBillingDate(billingDate, billingCycle, rangeStartDate);
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
  baseDate: Date = new Date(),
): string {
  assertBillingDate(billingDate);

  const base = new Date(
    Date.UTC(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
    ),
  );

  const [year, month, day] = billingDate.split("-").map(Number);
  const maxDay = getLastDayOfMonthUtc(year, month - 1);
  const anchoredDay = Math.min(day, maxDay);

  let nextDate = new Date(Date.UTC(year, month - 1, anchoredDay));

  while (nextDate < base) {
    nextDate = addCycle(nextDate, billingCycle);
  }

  return toIsoDateString(nextDate);
}

export async function initializeSubscriptionStore(): Promise<void> {
  await ensureInitialized();
  await syncSubscriptionPaymentLogs();
}

export async function listSubscriptionPaymentLogs(
  options: ListSubscriptionPaymentLogsOptions = {},
): Promise<SubscriptionPaymentLog[]> {
  await ensureInitialized();
  const database = await getDatabase();

  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (options.subscriptionId) {
    clauses.push("l.subscriptionId = ?");
    params.push(options.subscriptionId);
  }

  if (options.status) {
    clauses.push("l.status = ?");
    params.push(options.status);
  }

  if (options.dateFrom) {
    clauses.push("l.billingDate >= ?");
    params.push(options.dateFrom);
  }

  if (options.dateTo) {
    clauses.push("l.billingDate <= ?");
    params.push(options.dateTo);
  }

  if (typeof options.isActiveSubscription === "boolean") {
    clauses.push("s.isActive = ?");
    params.push(options.isActiveSubscription ? 1 : 0);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const orderDirection = options.sortDirection === "asc" ? "ASC" : "DESC";
  const limitClause =
    typeof options.limit === "number" && options.limit > 0 ? "LIMIT ?" : "";

  if (limitClause) {
    params.push(options.limit!);
  }

  const rows = await database.getAllAsync<{
    id: string;
    subscriptionId: string;
    subscriptionName: string;
    subscriptionTemplateKey: string | null;
    subscriptionIsActive: number;
    billingDate: string;
    status: string;
    amount: number;
    currency: string;
    categoryIdSnapshot: string;
    categoryNameSnapshot: string;
    createdAt: string;
    updatedAt: string;
  }>(
    `
      SELECT
        l.id,
        l.subscriptionId,
        s.name AS subscriptionName,
        s.templateKey AS subscriptionTemplateKey,
        s.isActive AS subscriptionIsActive,
        l.billingDate,
        l.status,
        l.amount,
        l.currency,
        l.categoryIdSnapshot,
        l.categoryNameSnapshot,
        l.createdAt,
        l.updatedAt
      FROM subscription_payment_logs l
      INNER JOIN subscriptions s ON s.id = l.subscriptionId
      ${whereClause}
      ORDER BY l.billingDate ${orderDirection}, l.createdAt ${orderDirection}
      ${limitClause}
    `,
    params,
  );

  return rows.map(mapPaymentLogRow);
}

async function upsertExpectedPaymentLog(
  database: SQLiteDatabase,
  subscription: SubscriptionWithCategory,
  billingDate: string,
  status: PaymentLogStatus,
  existingLog: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    categoryIdSnapshot: string;
    categoryNameSnapshot: string;
  } | null,
  now: string,
) {
  if (existingLog && existingLog.status === "paid") {
    return;
  }

  if (!existingLog) {
    await database.runAsync(
      `
        INSERT INTO subscription_payment_logs (
          id,
          subscriptionId,
          billingDate,
          status,
          amount,
          currency,
          categoryIdSnapshot,
          categoryNameSnapshot,
          createdAt,
          updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        generateId("paylog"),
        subscription.id,
        billingDate,
        status,
        subscription.amount,
        subscription.currency,
        subscription.categoryId,
        subscription.categoryName,
        now,
        now,
      ],
    );
    return;
  }

  await database.runAsync(
    `
      UPDATE subscription_payment_logs
      SET
        status = ?,
        amount = ?,
        currency = ?,
        categoryIdSnapshot = ?,
        categoryNameSnapshot = ?,
        updatedAt = ?
      WHERE id = ?
    `,
    [
      status,
      subscription.amount,
      subscription.currency,
      subscription.categoryId,
      subscription.categoryName,
      now,
      existingLog.id,
    ],
  );
}

async function syncSubscriptionPaymentLogsInternal(
  baseDate: Date = new Date(),
): Promise<void> {
  await ensureInitialized();
  const database = await getDatabase();
  const subscriptions = await listSubscriptions();
  const todayDateKey = getTodayDateKey(baseDate);
  const now = nowIsoString();

  await database.runAsync(
    `
      UPDATE subscription_payment_logs
      SET status = 'paid', updatedAt = ?
      WHERE status = 'scheduled' AND billingDate < ?
    `,
    [now, todayDateKey],
  );

  for (const subscription of subscriptions) {
    const existingLogs = await database.getAllAsync<{
      id: string;
      billingDate: string;
      status: string;
      amount: number;
      currency: string;
      categoryIdSnapshot: string;
      categoryNameSnapshot: string;
    }>(
      `
        SELECT
          id,
          billingDate,
          status,
          amount,
          currency,
          categoryIdSnapshot,
          categoryNameSnapshot
        FROM subscription_payment_logs
        WHERE subscriptionId = ?
      `,
      [subscription.id],
    );

    const existingByDate = new Map(
      existingLogs.map((log) => [log.billingDate, log]),
    );
    const expectedDates = getExpectedPaymentLogDates(subscription, baseDate);
    const expectedDateSet = new Set(expectedDates);

    for (const billingDate of expectedDates) {
      const status: PaymentLogStatus =
        billingDate < todayDateKey ? "paid" : "scheduled";
      await upsertExpectedPaymentLog(
        database,
        subscription,
        billingDate,
        status,
        existingByDate.get(billingDate) ?? null,
        now,
      );
    }

    for (const existingLog of existingLogs) {
      if (
        existingLog.status === "scheduled" &&
        !expectedDateSet.has(existingLog.billingDate)
      ) {
        await database.runAsync(
          `DELETE FROM subscription_payment_logs WHERE id = ?`,
          [existingLog.id],
        );
      }
    }
  }
}

export async function syncSubscriptionPaymentLogs(
  baseDate: Date = new Date(),
): Promise<void> {
  if (!paymentLogSyncPromise) {
    paymentLogSyncPromise = syncSubscriptionPaymentLogsInternal(baseDate).finally(
      () => {
        paymentLogSyncPromise = null;
      },
    );
  }

  return paymentLogSyncPromise;
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

  await syncSubscriptionPaymentLogs();

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

  assertAmount(input.amount);

  if (!isBillingCycle(input.billingCycle)) {
    throw new Error("billingCycle must be monthly or yearly.");
  }

  assertBillingDate(input.billingDate);

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
        billingCycle,
        billingDate,
        notifyDayBefore,
        categoryId,
        isActive,
        memo,
        createdAt,
        updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      trimmedName,
      input.templateKey ?? null,
      input.amount,
      input.billingCycle,
      input.billingDate,
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

  await syncSubscriptionPaymentLogs();

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
    assertAmount(input.amount);
    sets.push("amount = ?");
    params.push(input.amount);
  }

  if (input.currency !== undefined) {
    if (!isCurrency(input.currency)) {
      throw new Error("currency must be KRW.");
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

  await syncSubscriptionPaymentLogs();

  return updated;
}

export async function deleteSubscription(subscriptionId: string): Promise<void> {
  await ensureInitialized();
  const database = await getDatabase();

  await database.runAsync(
    `DELETE FROM subscription_payment_logs WHERE subscriptionId = ?`,
    [subscriptionId],
  );

  const result = await database.runAsync(
    `DELETE FROM subscriptions WHERE id = ?`,
    [subscriptionId],
  );

  if (result.changes === 0) {
    throw new Error("Subscription not found.");
  }
}
