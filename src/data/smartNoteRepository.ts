import { SmartNote, SmartNoteDraft, SmartNoteDraftStatus, SmartNoteStatus, SmartParseResult, SmartParserSettings } from "../domain/types";
import { database } from "./database";

type DbSmartNote = {
  id: number;
  uid: string;
  content: string;
  content_hash: string;
  parser_provider: SmartParserSettings["provider"];
  parser_model: string;
  status: SmartNoteStatus;
  parsed_count: number;
  converted_count: number;
  duplicate_count: number | null;
  ignored_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type DbSmartNoteDraft = {
  id: number;
  uid: string;
  note_id: number;
  draft_index: number;
  payload_json: string;
  status: SmartNoteDraftStatus;
  transaction_id: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export async function listSmartNotes(limit = 80): Promise<SmartNote[]> {
  const db = await database();
  const notes = await db.getAllAsync<DbSmartNote>(
    `SELECT n.*,
            (
              SELECT COUNT(*)
              FROM smart_notes d
              WHERE d.content_hash = n.content_hash
                AND d.id <> n.id
                AND d.deleted_at IS NULL
            ) AS duplicate_count
     FROM smart_notes n
     WHERE n.deleted_at IS NULL
     ORDER BY n.updated_at DESC, n.id DESC
     LIMIT ?`,
    [limit]
  );
  if (notes.length === 0) return [];
  const drafts = await db.getAllAsync<DbSmartNoteDraft>(
    `SELECT *
     FROM smart_note_drafts
     WHERE deleted_at IS NULL
       AND note_id IN (${notes.map(() => "?").join(",")})
     ORDER BY note_id DESC, draft_index ASC, id ASC`,
    notes.map((note) => note.id)
  );
  const mappedDrafts = await annotateDraftDuplicates(drafts.map(fromDbDraft));
  const draftsByNote = new Map<number, SmartNoteDraft[]>();
  for (const draft of mappedDrafts) {
    draftsByNote.set(draft.noteId, [...(draftsByNote.get(draft.noteId) ?? []), draft]);
  }
  return notes.map((note) => fromDbNote(note, draftsByNote.get(note.id) ?? []));
}

export async function saveSmartNoteParse(content: string, settings: SmartParserSettings, results: SmartParseResult[]): Promise<{ note: SmartNote; duplicateCount: number }> {
  const db = await database();
  const now = new Date().toISOString();
  const normalizedContent = content.trim();
  const contentHash = hashSmartNoteContent(normalizedContent);
  let noteId = 0;
  await db.withTransactionAsync(async () => {
    const noteResult = await db.runAsync(
      `INSERT INTO smart_notes
       (uid, content, content_hash, parser_provider, parser_model, status, parsed_count, converted_count, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, 'parsed', ?, 0, ?, ?, NULL)`,
      [makeUid("note"), normalizedContent, contentHash, settings.provider, settings.model.trim(), results.length, now, now]
    );
    noteId = Number(noteResult.lastInsertRowId);
    for (let index = 0; index < results.length; index += 1) {
      await db.runAsync(
        `INSERT INTO smart_note_drafts
         (uid, note_id, draft_index, payload_json, status, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, 'pending', ?, ?, NULL)`,
        [makeUid("draft"), noteId, index, JSON.stringify(results[index]), now, now]
      );
    }
  });
  const duplicateCount = await countSmartNoteDuplicates(contentHash, noteId);
  const note = (await listSmartNotes()).find((item) => item.id === noteId);
  if (!note) throw new Error("Smart note was saved but cannot be loaded.");
  return { note, duplicateCount };
}

export async function updateSmartNoteParse(noteId: number, content: string, settings: SmartParserSettings, results: SmartParseResult[]): Promise<void> {
  const db = await database();
  const now = new Date().toISOString();
  const converted = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM smart_note_drafts WHERE note_id = ? AND status = 'converted' AND deleted_at IS NULL",
    [noteId]
  );
  if ((converted?.count ?? 0) > 0) throw new Error("Cannot edit a smart note after one of its drafts has been converted.");
  const normalizedContent = content.trim();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE smart_notes
       SET content = ?, content_hash = ?, parser_provider = ?, parser_model = ?, status = 'parsed',
           parsed_count = ?, converted_count = 0, ignored_at = NULL, updated_at = ?, deleted_at = NULL
       WHERE id = ?`,
      [normalizedContent, hashSmartNoteContent(normalizedContent), settings.provider, settings.model.trim(), results.length, now, noteId]
    );
    await db.runAsync("UPDATE smart_note_drafts SET deleted_at = ?, updated_at = ? WHERE note_id = ? AND deleted_at IS NULL", [now, now, noteId]);
    for (let index = 0; index < results.length; index += 1) {
      await db.runAsync(
        `INSERT INTO smart_note_drafts
         (uid, note_id, draft_index, payload_json, status, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, 'pending', ?, ?, NULL)`,
        [makeUid("draft"), noteId, index, JSON.stringify(results[index]), now, now]
      );
    }
  });
}

export async function markSmartNoteDraftConverted(draftId: number, transactionId: number): Promise<void> {
  const db = await database();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    const draft = await db.getFirstAsync<{ note_id: number }>(
      "SELECT note_id FROM smart_note_drafts WHERE id = ? AND deleted_at IS NULL",
      [draftId]
    );
    if (!draft) return;
    await db.runAsync(
      "UPDATE smart_note_drafts SET status = 'converted', transaction_id = ?, updated_at = ? WHERE id = ?",
      [transactionId, now, draftId]
    );
    await refreshSmartNoteStatusInside(db, draft.note_id, now);
  });
}

export async function ignoreSmartNoteDraft(draftId: number): Promise<void> {
  const db = await database();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    const draft = await db.getFirstAsync<{ note_id: number }>(
      "SELECT note_id FROM smart_note_drafts WHERE id = ? AND deleted_at IS NULL",
      [draftId]
    );
    if (!draft) return;
    await db.runAsync("UPDATE smart_note_drafts SET status = 'ignored', updated_at = ? WHERE id = ?", [now, draftId]);
    await refreshSmartNoteStatusInside(db, draft.note_id, now);
  });
}

export async function ignoreSmartNote(noteId: number): Promise<void> {
  const db = await database();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "UPDATE smart_note_drafts SET status = 'ignored', updated_at = ? WHERE note_id = ? AND status = 'pending' AND deleted_at IS NULL",
      [now, noteId]
    );
    await db.runAsync("UPDATE smart_notes SET status = 'ignored', ignored_at = ?, updated_at = ? WHERE id = ?", [now, now, noteId]);
  });
}

export async function softDeleteSmartNote(noteId: number): Promise<void> {
  const db = await database();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync("UPDATE smart_note_drafts SET deleted_at = ?, updated_at = ? WHERE note_id = ? AND deleted_at IS NULL", [now, now, noteId]);
    await db.runAsync("UPDATE smart_notes SET deleted_at = ?, updated_at = ? WHERE id = ?", [now, now, noteId]);
  });
}

export async function hardDeleteSmartNote(noteId: number): Promise<void> {
  const db = await database();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM smart_note_drafts WHERE note_id = ?", [noteId]);
    await db.runAsync("DELETE FROM smart_notes WHERE id = ?", [noteId]);
  });
}

async function refreshSmartNoteStatusInside(db: Awaited<ReturnType<typeof database>>, noteId: number, now: string) {
  const stats = await db.getFirstAsync<{ total: number; converted: number; pending: number }>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) AS converted,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
     FROM smart_note_drafts
     WHERE note_id = ?
       AND deleted_at IS NULL`,
    [noteId]
  );
  const total = stats?.total ?? 0;
  const converted = stats?.converted ?? 0;
  const pending = stats?.pending ?? 0;
  const status: SmartNoteStatus = pending === 0 ? (converted > 0 ? "converted" : "ignored") : "parsed";
  await db.runAsync(
    "UPDATE smart_notes SET status = ?, parsed_count = ?, converted_count = ?, ignored_at = CASE WHEN ? = 'ignored' THEN ? ELSE ignored_at END, updated_at = ? WHERE id = ?",
    [status, total, converted, status, now, now, noteId]
  );
}

async function countSmartNoteDuplicates(contentHash: string, noteId: number) {
  const db = await database();
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM smart_notes WHERE content_hash = ? AND id <> ? AND deleted_at IS NULL",
    [contentHash, noteId]
  );
  return row?.count ?? 0;
}

function fromDbNote(row: DbSmartNote, drafts: SmartNoteDraft[]): SmartNote {
  return {
    id: row.id,
    uid: row.uid,
    content: row.content,
    contentHash: row.content_hash,
    parserProvider: row.parser_provider,
    parserModel: row.parser_model,
    status: row.status,
    parsedCount: row.parsed_count,
    convertedCount: row.converted_count,
    duplicateCount: row.duplicate_count ?? 0,
    ignoredAt: row.ignored_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    drafts
  };
}

function fromDbDraft(row: DbSmartNoteDraft): SmartNoteDraft {
  return {
    id: row.id,
    uid: row.uid,
    noteId: row.note_id,
    draftIndex: row.draft_index,
    payload: JSON.parse(row.payload_json) as SmartParseResult,
    status: row.status,
    duplicateCount: 0,
    transactionId: row.transaction_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

async function annotateDraftDuplicates(drafts: SmartNoteDraft[]): Promise<SmartNoteDraft[]> {
  if (drafts.length === 0) return drafts;
  const db = await database();
  const activeTransactions = await db.getAllAsync<{ note: string; amount: number; category: string; account: string; date: string }>(
    "SELECT note, amount, category, account, date FROM transactions WHERE deleted_at IS NULL"
  );
  const draftCounts = new Map<string, number>();
  for (const draft of drafts) {
    if (draft.status === "ignored") continue;
    const key = smartDraftKey(draft.payload);
    draftCounts.set(key, (draftCounts.get(key) ?? 0) + 1);
  }
  const transactionCounts = new Map<string, number>();
  for (const transaction of activeTransactions) {
    const key = smartRecordKey(transaction);
    transactionCounts.set(key, (transactionCounts.get(key) ?? 0) + 1);
  }
  return drafts.map((draft) => {
    const key = smartDraftKey(draft.payload);
    const duplicateCount = Math.max(0, (draftCounts.get(key) ?? 0) - 1) + (transactionCounts.get(key) ?? 0);
    return { ...draft, duplicateCount };
  });
}

function smartDraftKey(result: SmartParseResult) {
  return smartRecordKey({
    note: result.note,
    amount: result.amount,
    category: result.category,
    account: result.account,
    date: result.date
  });
}

function smartRecordKey(record: { note: string; amount: number; category: string; account: string; date: string }) {
  return [
    normalizeKeyText(record.note),
    record.amount,
    normalizeKeyText(record.category),
    normalizeKeyText(record.account),
    record.date
  ].join("|");
}

function normalizeKeyText(value: string) {
  return value.toLowerCase().normalize("NFC").replace(/\s+/g, " ").trim();
}

function hashSmartNoteContent(content: string) {
  const normalized = content.toLowerCase().normalize("NFC").replace(/\s+/g, " ").trim();
  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function makeUid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
