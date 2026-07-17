import { useCallback, useState } from "react";
import { isDdMmYyyy } from "../../data/csv";
import { createTransactions, deleteTransaction, makeBlankTransaction, todayCsvDate, upsertTransaction } from "../../data/db";
import { AppNotificationTargetType, RecurrenceDraft, Transaction, TransactionInput } from "../../domain/types";
import { addCycleToCsvDate } from "../../shared/date";
import { ConfirmDialogState } from "../confirmDialog";

const DEFAULT_RECURRENCE: RecurrenceDraft = {
  enabled: false,
  frequency: "monthly",
  count: 2
};

type UseTransactionEditorArgs = {
  refresh: () => Promise<void>;
  notify: (message: string, options?: { targetType?: AppNotificationTargetType; targetId?: number }) => void;
  requestConfirmation: (dialog: ConfirmDialogState) => void;
  setBusy: (busy: boolean) => void;
};

export function useTransactionEditor({ refresh, notify, requestConfirmation, setBusy }: UseTransactionEditorArgs) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [draft, setDraft] = useState<TransactionInput | null>(null);
  const [draftBaseline, setDraftBaseline] = useState<TransactionInput | null>(null);
  const [recurrence, setRecurrence] = useState<RecurrenceDraft>(DEFAULT_RECURRENCE);
  const [recurrenceBaseline, setRecurrenceBaseline] = useState<RecurrenceDraft>(DEFAULT_RECURRENCE);

  const openCreate = () => {
    const blank = makeBlankTransaction(todayCsvDate());
    setSelectedTransaction(null);
    setEditing(null);
    setDraft(blank);
    setDraftBaseline(blank);
    setRecurrence(DEFAULT_RECURRENCE);
    setRecurrenceBaseline(DEFAULT_RECURRENCE);
  };

  const openEdit = (tx: Transaction) => {
    const input = {
      externalId: tx.externalId,
      note: tx.note,
      amount: tx.amount,
      category: tx.category,
      reportGroup: tx.reportGroup,
      debtId: tx.debtId,
      account: tx.account,
      currency: tx.currency,
      date: tx.date,
      event: tx.event,
      excludeReport: tx.excludeReport,
      important: tx.important
    };
    setSelectedTransaction(null);
    setEditing(tx);
    setDraft(input);
    setDraftBaseline(input);
    setRecurrence({ ...DEFAULT_RECURRENCE, enabled: false });
    setRecurrenceBaseline({ ...DEFAULT_RECURRENCE, enabled: false });
  };

  const closeEditor = useCallback(() => {
    setDraft(null);
    setDraftBaseline(null);
    setEditing(null);
    setRecurrence(DEFAULT_RECURRENCE);
    setRecurrenceBaseline(DEFAULT_RECURRENCE);
  }, []);

  const requestCloseEditor = useCallback(() => {
    if (!draft || (!isDraftDirty(draft, draftBaseline) && !isRecurrenceDirty(recurrence, recurrenceBaseline))) {
      closeEditor();
      return;
    }

    requestConfirmation({
      title: "Discard changes?",
      message: "This transaction has unsaved changes.",
      confirmText: "Discard",
      cancelText: "Keep editing",
      destructive: true,
      onConfirm: closeEditor
    });
  }, [closeEditor, draft, draftBaseline, recurrence, recurrenceBaseline, requestConfirmation]);

  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.note.trim()) {
      notify("Note is required.");
      return;
    }
    if (!Number.isInteger(draft.amount)) {
      notify("Amount must be an integer.");
      return;
    }
    if (!isDdMmYyyy(draft.date)) {
      notify("Date must be dd/MM/yyyy.");
      return;
    }
    if (!editing && recurrence.enabled && (!Number.isInteger(recurrence.count) || recurrence.count < 2 || recurrence.count > 120)) {
      notify("Repeat count must be between 2 and 120.");
      return;
    }
    setBusy(true);
    try {
      const normalized = { ...draft, note: draft.note.trim(), category: draft.category.trim() };
      if (!editing && recurrence.enabled) {
        await createTransactions(
          Array.from({ length: recurrence.count }, (_value, index) => ({
            ...normalized,
            externalId: index === 0 ? normalized.externalId : null,
            date: addCycleToCsvDate(normalized.date, recurrence.frequency, index)
          }))
        );
      } else {
        await upsertTransaction(normalized, editing?.id);
      }
      closeEditor();
      await refresh();
      notify(
        editing
          ? "Transaction updated."
          : recurrence.enabled
            ? `Recurring transaction added: ${recurrence.count} rows.`
            : "Transaction added.",
        editing ? { targetType: "transaction", targetId: editing.id } : undefined
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const removeTransaction = async (tx: Transaction) => {
    requestConfirmation({
      title: "Delete transaction",
      message: tx.note,
      confirmText: "Delete",
      confirmIcon: "trash-outline",
      destructive: true,
      onConfirm: async () => {
        await deleteTransaction(tx.id);
        await refresh();
        notify("Transaction deleted.");
      }
    });
  };

  return {
    selectedTransaction,
    setSelectedTransaction,
    draft,
    setDraft,
    recurrence,
    setRecurrence,
    editing,
    openCreate,
    openEdit,
    requestCloseEditor,
    saveDraft,
    removeTransaction
  };
}

function isDraftDirty(draft: TransactionInput, baseline: TransactionInput | null) {
  if (!baseline) return true;
  return JSON.stringify(normalizeDraft(draft)) !== JSON.stringify(normalizeDraft(baseline));
}

function isRecurrenceDirty(recurrence: RecurrenceDraft, baseline: RecurrenceDraft) {
  return JSON.stringify(recurrence) !== JSON.stringify(baseline);
}

function normalizeDraft(draft: TransactionInput) {
  return {
    ...draft,
    note: draft.note.trim(),
    category: draft.category.trim(),
    account: draft.account.trim(),
    currency: draft.currency.trim(),
    event: draft.event.trim()
  };
}
