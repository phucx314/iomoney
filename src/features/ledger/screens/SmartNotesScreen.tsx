import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { REPORT_GROUP_LABEL } from "../../../domain/reportGroup";
import { SmartNote, SmartNoteDraft, SmartParserSettings } from "../../../domain/types";
import { Field, PrimaryButton, SecondaryButton, SegmentedControl } from "../../../shared/components";
import { formatSignedVnd } from "../../../shared/format";
import { space, styles, theme } from "../../../shared/styles";

type SmartNotesScreenProps = {
  notes: SmartNote[];
  text: string;
  settings: SmartParserSettings;
  editingNoteId: number | null;
  busy: boolean;
  onBack: () => void;
  onTextChange: (text: string) => void;
  onSettingsChange: (settings: SmartParserSettings) => void;
  onParse: () => void;
  onReviewDraft: (draft: SmartNoteDraft) => void;
  onAcceptDraft: (draft: SmartNoteDraft) => void;
  onIgnoreDraft: (draft: SmartNoteDraft) => void;
  onIgnoreNote: (note: SmartNote) => void;
  onEditNote: (note: SmartNote) => void;
  onCancelEdit: () => void;
  onSoftDeleteNote: (note: SmartNote) => void;
  onHardDeleteNote: (note: SmartNote) => void;
  showBack?: boolean;
  scrollOffset: number;
  onScrollOffsetChange: (offset: number) => void;
};

const PROVIDERS: SmartParserSettings["provider"][] = ["local", "online"];

export function SmartNotesScreen({
  notes,
  text,
  settings,
  editingNoteId,
  busy,
  onBack,
  onTextChange,
  onSettingsChange,
  onParse,
  onReviewDraft,
  onAcceptDraft,
  onIgnoreDraft,
  onIgnoreNote,
  onEditNote,
  onCancelEdit,
  onSoftDeleteNote,
  onHardDeleteNote,
  showBack = true,
  scrollOffset,
  onScrollOffsetChange
}: SmartNotesScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const pendingDrafts = notes.reduce((sum, note) => sum + note.drafts.filter((draft) => draft.status === "pending").length, 0);
  const duplicateNotes = notes.filter((note) => note.duplicateCount > 0).length;
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScrollOffsetChange(event.nativeEvent.contentOffset.y);
  };

  useEffect(() => {
    const timeout = setTimeout(() => scrollRef.current?.scrollTo({ y: scrollOffset, animated: false }), 0);
    return () => clearTimeout(timeout);
  }, [scrollOffset]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.content}
      contentContainerStyle={[styles.contentPad, { paddingBottom: space.pageBottom + insets.bottom }]}
      onScroll={handleScroll}
      scrollEventThrottle={100}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.pageTitleRow}>
        {showBack ? (
          <Pressable accessibilityLabel="Back" style={styles.pageBackButton} onPress={onBack}>
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
          </Pressable>
        ) : null}
        <View style={styles.flex}>
          <Text style={styles.sectionTitle}>Smart Notes</Text>
          <Text style={styles.rowMeta}>Capture first, review later</Text>
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Natural note</Text>
          <TextInput
            value={text}
            onChangeText={onTextChange}
            multiline
            textAlignVertical="top"
            style={styles.smartNoteInput}
            placeholder="e.g. salary 30M, pho 53k, hotel 3M"
            placeholderTextColor={theme.colors.placeholder}
          />
        </View>
        <SegmentedControl
          title="Parser"
          options={PROVIDERS}
          value={settings.provider}
          onChange={(provider) => onSettingsChange({ ...settings, provider })}
          label={(provider) => (provider === "local" ? "Local" : "Online")}
        />
        {settings.provider === "online" ? (
          <>
            <Field label="Endpoint" value={settings.endpoint} onChangeText={(endpoint) => onSettingsChange({ ...settings, endpoint })} />
            <Field label="Model" value={settings.model} onChangeText={(model) => onSettingsChange({ ...settings, model })} />
            <Field label="API key" value={settings.apiKey} onChangeText={(apiKey) => onSettingsChange({ ...settings, apiKey })} />
          </>
        ) : null}
        <View style={styles.smartComposerActions}>
          {editingNoteId ? <SecondaryButton icon="close-outline" text="Cancel edit" onPress={onCancelEdit} disabled={busy} /> : null}
          <PrimaryButton icon="sparkles-outline" text={editingNoteId ? "Update note" : "Parse and save note"} onPress={onParse} disabled={busy || !text.trim()} />
        </View>
      </View>

      <View style={styles.metricGrid}>
        <View style={styles.smartNoteStat}>
          <Text style={styles.miniValue}>{notes.length}</Text>
          <Text style={styles.miniLabel}>Notes</Text>
        </View>
        <View style={styles.smartNoteStat}>
          <Text style={[styles.miniValue, pendingDrafts > 0 && styles.amountExpense]}>{pendingDrafts}</Text>
          <Text style={styles.miniLabel}>Pending drafts</Text>
        </View>
        <View style={styles.smartNoteStat}>
          <Text style={[styles.miniValue, duplicateNotes > 0 && styles.amountWarning]}>{duplicateNotes}</Text>
          <Text style={styles.miniLabel}>Duplicate notes</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, styles.sectionTitleBlock, styles.sectionTitleSpaced]}>Inbox</Text>
      {notes.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={28} color={theme.colors.subtle} />
          <Text style={styles.rowMeta}>No smart notes yet.</Text>
        </View>
      ) : (
        <View style={styles.smartNoteInbox}>
          {notes.map((note) => (
            <SmartNoteCard
              key={note.uid}
              note={note}
              onReviewDraft={onReviewDraft}
              onAcceptDraft={onAcceptDraft}
              onIgnoreDraft={onIgnoreDraft}
              onIgnoreNote={onIgnoreNote}
              onEditNote={onEditNote}
              onSoftDeleteNote={onSoftDeleteNote}
              onHardDeleteNote={onHardDeleteNote}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function SmartNoteCard({
  note,
  onReviewDraft,
  onAcceptDraft,
  onIgnoreDraft,
  onIgnoreNote,
  onEditNote,
  onSoftDeleteNote,
  onHardDeleteNote
}: {
  note: SmartNote;
  onReviewDraft: (draft: SmartNoteDraft) => void;
  onAcceptDraft: (draft: SmartNoteDraft) => void;
  onIgnoreDraft: (draft: SmartNoteDraft) => void;
  onIgnoreNote: (note: SmartNote) => void;
  onEditNote: (note: SmartNote) => void;
  onSoftDeleteNote: (note: SmartNote) => void;
  onHardDeleteNote: (note: SmartNote) => void;
}) {
  const pendingCount = note.drafts.filter((draft) => draft.status === "pending").length;
  const draftTitle = note.drafts.map((draft) => draft.payload.note).slice(0, 3).join(", ");
  return (
    <View style={styles.smartNoteCard}>
      <View style={styles.smartNoteHeader}>
        <View style={styles.flex}>
          <Text style={styles.rowTitle} numberOfLines={2}>{draftTitle || note.content}</Text>
          <Text style={styles.rowMeta}>
            {note.parserProvider === "online" ? note.parserModel || "Online parser" : "Local parser"} - {note.convertedCount}/{note.parsedCount} converted
          </Text>
          <Text style={styles.rowMeta} numberOfLines={2}>Raw: {note.content}</Text>
        </View>
        <StatusPill status={note.status} pendingCount={pendingCount} />
      </View>
      <View style={styles.smartNoteManageRow}>
        <Pressable style={styles.smartNoteManageButton} onPress={() => onEditNote(note)}>
          <Ionicons name="create-outline" size={16} color={theme.colors.accent} />
          <Text style={styles.smartNoteManageText}>Edit raw</Text>
        </Pressable>
        <Pressable style={styles.smartNoteManageButton} onPress={() => onSoftDeleteNote(note)}>
          <Ionicons name="trash-outline" size={16} color={theme.colors.muted} />
          <Text style={styles.smartNoteManageText}>Delete</Text>
        </Pressable>
        <Pressable style={styles.smartNoteManageButton} onPress={() => onHardDeleteNote(note)}>
          <Ionicons name="trash-bin-outline" size={16} color={theme.colors.expense} />
          <Text style={styles.smartNoteManageText}>Hard delete</Text>
        </Pressable>
      </View>
      {note.duplicateCount > 0 ? (
        <View style={styles.smartWarningRow}>
          <Ionicons name="copy-outline" size={16} color={theme.colors.warning} />
          <Text style={styles.hint}>Similar raw note exists {note.duplicateCount} time{note.duplicateCount === 1 ? "" : "s"}.</Text>
        </View>
      ) : null}
      <View style={styles.smartDraftList}>
        {note.drafts.map((draft, index) => (
          <DraftRow
            key={draft.uid}
            draft={draft}
            last={index === note.drafts.length - 1}
            onReview={() => onReviewDraft(draft)}
            onAccept={() => onAcceptDraft(draft)}
            onIgnore={() => onIgnoreDraft(draft)}
          />
        ))}
      </View>
      {pendingCount > 0 ? (
        <View style={styles.smartNoteFooter}>
          <SecondaryButton icon="checkmark-done-outline" text="Ignore remaining" onPress={() => onIgnoreNote(note)} />
        </View>
      ) : null}
    </View>
  );
}

function DraftRow({ draft, last, onReview, onAccept, onIgnore }: { draft: SmartNoteDraft; last: boolean; onReview: () => void; onAccept: () => void; onIgnore: () => void }) {
  const pending = draft.status === "pending";
  return (
    <Pressable style={[styles.smartDraftRow, last && styles.smartDraftRowLast]} onPress={pending ? onReview : undefined}>
      <View style={styles.flex}>
        <View style={styles.smartDraftTitleRow}>
          <Text style={styles.rowTitle} numberOfLines={1}>{draft.payload.note}</Text>
          {draft.duplicateCount > 0 ? <Ionicons name="copy-outline" size={15} color={theme.colors.warning} /> : null}
        </View>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {draft.payload.date} - {draft.payload.category} - {REPORT_GROUP_LABEL[draft.payload.reportGroup]}
        </Text>
        {draft.duplicateCount > 0 ? <Text style={styles.smartDuplicateText}>Potential duplicate: {draft.duplicateCount} similar record{draft.duplicateCount === 1 ? "" : "s"}</Text> : null}
      </View>
      <Text style={[styles.rowAmount, draft.payload.amount >= 0 ? styles.amountIncome : styles.amountExpense]}>{formatSignedVnd(draft.payload.amount)}</Text>
      {pending ? (
        <View style={styles.smartDraftActions}>
          <Pressable accessibilityLabel="Accept draft" style={styles.smartDraftIconButton} onPress={onAccept}>
            <Ionicons name="checkmark-outline" size={18} color={theme.colors.accent} />
          </Pressable>
          <Pressable accessibilityLabel="Ignore draft" style={styles.smartDraftIconButton} onPress={onIgnore}>
            <Ionicons name="remove-circle-outline" size={18} color={theme.colors.muted} />
          </Pressable>
        </View>
      ) : (
        <Ionicons name={draft.status === "converted" ? "checkmark-circle" : "remove-circle"} size={18} color={draft.status === "converted" ? theme.colors.accent : theme.colors.muted} />
      )}
    </Pressable>
  );
}

function StatusPill({ status, pendingCount }: { status: SmartNote["status"]; pendingCount: number }) {
  const text = status === "converted" ? "Done" : status === "ignored" ? "Ignored" : pendingCount > 0 ? `${pendingCount} pending` : "Parsed";
  return (
    <View style={[styles.smartStatusPill, status === "converted" && styles.smartStatusDone, status === "ignored" && styles.smartStatusMuted]}>
      <Text style={styles.smartStatusText}>{text}</Text>
    </View>
  );
}
