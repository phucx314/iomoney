import { StyleSheet } from "react-native";

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pageBottom: 96,
  modalBottom: 120
};

export const radius = {
  hairline: 3,
  sm: 6,
  md: 8,
  lg: 12,
  card: 14,
  xl: 18,
  sheet: 24,
  round: 999
};

export const sizing = {
  iconButton: 44,
  control: 46,
  search: 44,
  tabBase: 60,
  tabMin: 72,
  modalHeader: 64,
  row: 64,
  sheetHeader: 58
};

export const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  flex: {
    flex: 1
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.md
  },
  header: {
    minHeight: 74,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF"
  },
  headerIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md
  },
  headerLogoFrame: {
    width: 64,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  headerLogo: {
    width: 56,
    height: 28
  },
  headerTextBlock: {
    flex: 1,
    minWidth: 0
  },
  appName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A"
  },
  subtitle: {
    marginTop: space.xxs,
    fontSize: 13,
    color: "#64748B"
  },
  headerChip: {
    minHeight: 34,
    maxWidth: 118,
    borderRadius: radius.round,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#CCFBF1",
    backgroundColor: "#F0FDFA",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md
  },
  headerChipText: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "800"
  },
  iconButton: {
    width: sizing.iconButton,
    height: sizing.iconButton,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2E8F0"
  },
  content: {
    flex: 1
  },
  contentPad: {
    padding: space.lg,
    paddingBottom: space.pageBottom
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A"
  },
  sectionTitleBlock: {
    marginBottom: space.md,
  },
  sectionTitleSpaced: {
    marginTop: space.xxl
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
    marginTop: space.md
  },
  rangeGrid: {
    gap: space.md
  },
  multiSelectWrap: {
    marginBottom: space.md
  },
  multiSelectPanel: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    overflow: "hidden"
  },
  multiOption: {
    minHeight: sizing.control,
    paddingHorizontal: space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0"
  },
  multiOptionActive: {
    backgroundColor: "#ECFDF5"
  },
  multiOptionText: {
    flex: 1,
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700"
  },
  multiEmpty: {
    color: "#64748B",
    fontSize: 13,
    padding: space.md
  },
  metric: {
    flexBasis: "45%",
    flexGrow: 1,
    minHeight: 112,
    borderRadius: radius.xl,
    padding: space.md,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.md
  },
  metricIconGlyph: {
    width: 32,
    height: 32,
    lineHeight: 32,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false
  },
  metricLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
    textTransform: "uppercase"
  },
  metricValue: {
    marginTop: space.sm,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800"
  },
  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: space.lg
  },
  listPanel: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: "hidden"
  },
  listSpacer: {
    height: space.sm
  },
  categoryPanel: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md
  },
  categoryRow: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md
  },
  categoryIconBox: {
    position: "relative",
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  categoryIconGlyph: {
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false
  },
  flowBadge: {
    position: "absolute",
    right: -space.xs,
    bottom: -space.xs,
    width: 18,
    height: 18,
    borderRadius: radius.round,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  flowBadgeIcon: {
    width: 14,
    height: 14,
    lineHeight: 14,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false
  },
  barTrack: {
    height: 6,
    borderRadius: radius.hairline,
    backgroundColor: "#E2E8F0",
    marginTop: space.sm,
    overflow: "hidden"
  },
  barFill: {
    height: 6,
    borderRadius: radius.hairline
  },
  txListItem: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0"
  },
  txListItemLast: {
    borderBottomWidth: 0
  },
  txListItemSelected: {
    backgroundColor: "#ECFDF5"
  },
  listSelectionMark: {
    width: 22,
    height: 22,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center"
  },
  listSelectionMarkActive: {
    borderColor: "#0F766E",
    backgroundColor: "#0F766E"
  },
  listTextButton: {
    minHeight: sizing.control,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0"
  },
  listTextButtonText: {
    color: "#0F766E",
    fontSize: 13,
    fontWeight: "800"
  },
  listEmptyText: {
    paddingHorizontal: space.lg,
    paddingVertical: space.lg
  },
  listItemLast: {
    marginBottom: 0
  },
  rowTitle: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "700"
  },
  rowMeta: {
    marginTop: space.xs,
    fontSize: 12,
    color: "#64748B"
  },
  amountExpense: {
    color: "#B91C1C",
    fontWeight: "800",
    fontSize: 13
  },
  amountIncome: {
    color: "#047857",
    fontWeight: "800",
    fontSize: 13
  },
  muted: {
    color: "#64748B",
    fontSize: 13
  },
  empty: {
    textAlign: "center",
    marginTop: sizing.iconButton,
    color: "#64748B"
  },
  filterPanel: {
    padding: space.lg,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
    gap: space.md
  },
  filterButton: {
    minHeight: 52,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: space.md
  },
  filterButtonLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  filterButtonValue: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "800",
    marginTop: space.xxs
  },
  selectionToolbar: {
    minHeight: sizing.control,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm
  },
  bulkTitle: {
    flex: 1,
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "800"
  },
  bulkCancelButton: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: space.sm
  },
  bulkCancel: {
    color: "#0F766E",
    fontSize: 13,
    fontWeight: "800"
  },
  searchBox: {
    height: sizing.search,
    borderRadius: radius.lg,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A"
  },
  listPad: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.pageBottom
  },
  transactionListShell: {
    flex: 1,
    paddingHorizontal: space.lg,
    paddingTop: space.lg
  },
  transactionListPanel: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 0,
    position: "relative"
  },
  transactionListContent: {
    flexGrow: 1
  },
  ledgerBottomCue: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 96,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: space.md,
    zIndex: 3
  },
  ledgerBottomGradient: {
    ...StyleSheet.absoluteFillObject
  },
  ledgerBottomArrow: {
    width: 36,
    height: 36,
    borderRadius: radius.round,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 118, 110, 0.28)",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 0
  },
  ledgerTopButton: {
    position: "absolute",
    right: space.md,
    bottom: space.md,
    minHeight: 42,
    borderRadius: radius.round,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(148, 163, 184, 0.5)",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    paddingHorizontal: space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    elevation: 0,
    zIndex: 4
  },
  ledgerTopButtonText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800"
  },
  listFooter: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    paddingVertical: space.lg
  },
  notificationHeader: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md
  },
  notificationItem: {
    padding: space.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    marginBottom: space.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md
  },
  notificationIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  notificationMessage: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  notificationTime: {
    color: "#64748B",
    fontSize: 12,
    marginTop: space.sm
  },
  selectWrap: {
    marginBottom: space.md
  },
  segmentedWrap: {
    marginBottom: space.md
  },
  segmentedRow: {
    minHeight: sizing.control,
    padding: space.xxs,
    borderRadius: radius.md,
    backgroundColor: "#E2E8F0",
    flexDirection: "row",
    gap: space.xxs
  },
  segmentChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.sm
  },
  segmentChipActive: {
    backgroundColor: "#0F172A"
  },
  segmentText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "800"
  },
  segmentTextActive: {
    color: "#FFFFFF"
  },
  selectButton: {
    minHeight: sizing.control,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md
  },
  selectText: {
    flex: 1,
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700"
  },
  dropdownOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.35)"
  },
  dropdownSheet: {
    maxHeight: "72%",
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: "#FFFFFF",
    overflow: "hidden"
  },
  dropdownHeader: {
    minHeight: sizing.sheetHeader,
    paddingHorizontal: space.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0"
  },
  dropdownTitle: {
    fontSize: 17,
    color: "#0F172A",
    fontWeight: "800"
  },
  dropdownOption: {
    minHeight: 50,
    paddingHorizontal: space.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0"
  },
  dropdownOptionActive: {
    backgroundColor: "#ECFDF5"
  },
  dropdownOptionText: {
    flex: 1,
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700"
  },
  dropdownOptionTextActive: {
    color: "#0F766E"
  },
  actionOption: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0"
  },
  actionOptionDanger: {
    borderBottomWidth: 0
  },
  actionOptionLabel: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md
  },
  actionOptionText: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800"
  },
  actionOptionTextDanger: {
    color: "#B91C1C"
  },
  confirmOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: space.xl,
    backgroundColor: "rgba(15, 23, 42, 0.42)"
  },
  confirmCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: space.lg
  },
  confirmTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800"
  },
  confirmMessage: {
    marginTop: space.sm,
    color: "#475569",
    fontSize: 14,
    lineHeight: 20
  },
  confirmActions: {
    marginTop: space.lg,
    flexDirection: "row",
    gap: space.md
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.35)"
  },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: "#FFFFFF",
    overflow: "hidden"
  },
  sheetHandle: {
    width: sizing.iconButton,
    height: 5,
    borderRadius: radius.hairline,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginTop: space.md
  },
  sheetHeader: {
    minHeight: sizing.sheetHeader,
    paddingHorizontal: space.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0"
  },
  sheetTitle: {
    fontSize: 17,
    color: "#0F172A",
    fontWeight: "800"
  },
  sheetBody: {
    padding: space.lg
  },
  sheetFooter: {
    padding: space.lg,
    flexDirection: "row",
    gap: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0"
  },
  detailHero: {
    minHeight: sizing.row,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginBottom: space.md
  },
  detailTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: space.xs
  },
  detailRow: {
    minHeight: 42,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.lg,
    paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0"
  },
  detailLabel: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700"
  },
  detailValue: {
    flex: 1,
    color: "#0F172A",
    textAlign: "right",
    fontSize: 13,
    fontWeight: "700"
  },
  syncText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A"
  },
  syncHint: {
    color: "#64748B",
    marginTop: space.sm,
    lineHeight: 20
  },
  syncStats: {
    flexDirection: "row",
    gap: space.sm,
    marginVertical: space.lg
  },
  miniStat: {
    flex: 1,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: "#F1F5F9"
  },
  miniValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A"
  },
  miniLabel: {
    fontSize: 11,
    color: "#64748B",
    marginTop: space.xs
  },
  primaryButton: {
    minHeight: sizing.control,
    borderRadius: radius.lg,
    backgroundColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.lg
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800"
  },
  secondaryButton: {
    minHeight: sizing.control,
    borderRadius: radius.lg,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.lg
  },
  secondaryButtonText: {
    color: "#0F172A",
    fontWeight: "800"
  },
  dangerButton: {
    minHeight: sizing.control,
    borderRadius: radius.lg,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.lg
  },
  dangerButtonText: {
    color: "#991B1B",
    fontWeight: "800"
  },
  buttonStack: {
    gap: space.md
  },
  disabled: {
    opacity: 0.55
  },
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.md,
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    gap: space.md
  },
  tabPill: {
    flex: 1,
    height: sizing.tabBase,
    borderRadius: radius.round,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(148, 163, 184, 0.45)",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    flexDirection: "row",
    overflow: "hidden",
    elevation: 0
  },
  tabAddButton: {
    width: sizing.tabBase,
    height: sizing.tabBase,
    borderRadius: radius.round,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 118, 110, 0.5)",
    backgroundColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
    elevation: 0
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs
  },
  tabLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "700"
  },
  tabLabelActive: {
    color: "#0F766E"
  },
  modalShell: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  modalHeader: {
    height: sizing.modalHeader,
    paddingHorizontal: space.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0"
  },
  modalTitle: {
    fontSize: 20,
    color: "#0F172A",
    fontWeight: "800"
  },
  modalContent: {
    padding: space.lg,
    paddingBottom: space.modalBottom
  },
  field: {
    marginBottom: space.lg
  },
  categoryEditorHeader: {
    minHeight: sizing.sheetHeader,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginBottom: space.md
  },
  categoryPreview: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800"
  },
  recurrencePanel: {
    padding: space.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    marginBottom: space.lg
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    marginBottom: space.sm,
    textTransform: "uppercase"
  },
  input: {
    minHeight: sizing.control,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
    paddingHorizontal: space.md,
    fontSize: 15
  },
  hint: {
    marginTop: space.xs,
    color: "#64748B",
    fontSize: 12
  },
  checkboxRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md
  },
  checkboxLabel: {
    color: "#0F172A",
    fontWeight: "700"
  },
  modalFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: space.lg,
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    gap: space.md
  }
});
