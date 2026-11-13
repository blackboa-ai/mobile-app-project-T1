import * as SQLite from 'expo-sqlite';

export type Case = {
  id: number;
  title: string;
  caseNumber: string;
  court: string;
  nextHearing: string; // YYYY-MM-DD
  notes: string;
  createdAt: string;   // ISO timestamp
};

const DB_NAME = 'casediary.db';

let db: SQLite.SQLiteDatabase | null = null;

// Open the database, create the table if it doesn't exist, run migrations,
// and seed sample Rampur cases on first run.
export async function initDatabase(): Promise<void> {
  if (db) return;
  db = await SQLite.openDatabaseAsync(DB_NAME);

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      caseNumber TEXT NOT NULL,
      court TEXT NOT NULL,
      nextHearing TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  // Migration: add notes column if it doesn't exist.
  // SQLite has no "ADD COLUMN IF NOT EXISTS", so check PRAGMA table_info first.
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(cases)');
  const hasNotes = columns.some((c) => c.name === 'notes');
  if (!hasNotes) {
    await db.execAsync("ALTER TABLE cases ADD COLUMN notes TEXT NOT NULL DEFAULT ''");
  }

  // Seed sample cases only if the table is empty.
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM cases'
  );
  if (row && row.count === 0) {
    await seedSampleCases();
  }
}

async function seedSampleCases(): Promise<void> {
  if (!db) return;
  const samples = [
    ['State vs. Ramesh Kumar', 'CRL/245/2025', 'District Court Rampur — Criminal', '2026-11-15', 'Witness summons issued. Client to confirm attendance.'],
    ['Suresh Sharma vs. Mohan Lal', 'CS/112/2025', 'District Court Rampur — Civil', '2026-11-14', ''],
    ['Smt. Anita Devi vs. State', 'MACT/78/2025', 'District Court Rampur — Motor Accident', '2026-11-20', 'Insurance company rep to be present.'],
    ['Vijay Singh vs. Sunita Devi', 'FAM/33/2025', 'District Court Rampur — Family', '2026-11-13', ''],
  ];
  const now = new Date().toISOString();
  for (const [title, caseNumber, court, nextHearing, notes] of samples) {
    await db.runAsync(
      'INSERT INTO cases (title, caseNumber, court, nextHearing, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      title, caseNumber, court, nextHearing, notes, now
    );
  }
}

// Get all cases, sorted by next hearing date (earliest first).
export async function getAllCases(): Promise<Case[]> {
  if (!db) await initDatabase();
  if (!db) return [];
  const rows = await db.getAllAsync<Case>(
    'SELECT * FROM cases ORDER BY nextHearing ASC, id ASC'
  );
  return rows;
}

// Add a new case. Returns the new case's id.
export async function addCase(input: {
  title: string;
  caseNumber: string;
  court: string;
  nextHearing: string;
  notes: string;
}): Promise<number> {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');
  const now = new Date().toISOString();
  const result = await db.runAsync(
    'INSERT INTO cases (title, caseNumber, court, nextHearing, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    input.title, input.caseNumber, input.court, input.nextHearing, input.notes, now
  );
  return result.lastInsertRowId;
}

// Update an existing case.
export async function updateCase(id: number, input: {
  title: string;
  caseNumber: string;
  court: string;
  nextHearing: string;
  notes: string;
}): Promise<void> {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');
  await db.runAsync(
    'UPDATE cases SET title = ?, caseNumber = ?, court = ?, nextHearing = ?, notes = ? WHERE id = ?',
    input.title, input.caseNumber, input.court, input.nextHearing, input.notes, id
  );
}

// Delete a case by id.
export async function deleteCase(id: number): Promise<void> {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');
  await db.runAsync('DELETE FROM cases WHERE id = ?', id);
}