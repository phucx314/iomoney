import { StyleSheet } from "react-native";

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pageBottom: 104,
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
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF"
  },
  appName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A"
  },
  subtitle: {
    marginTop: space.xxs,
    fontSize: 13,
    color: "#64748B"
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
    borderRadius: radius.card,
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
  categoryRow: {
    minHeight: 48,
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
  txRow: {
    minHeight: sizing.row,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    marginBottom: space.md
  },
  txRowSelected: {
    borderColor: "#0F766E",
    backgroundColor: "#ECFDF5"
  },
  listItemLast: {
    marginBottom: 0
  },
  selectionMark: {
    position: "absolute",
    top: space.sm,
    right: space.sm,
    width: 20,
    height: 20,
    borderRadius: radius.round,
    backgroundColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2
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
  bulkBar: {
    padding: space.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "#99F6E4",
    backgroundColor: "#F0FDFA"
  },
  bulkTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: space.sm
  },
  bulkCancel: {
    color: "#0F766E",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    paddingTop: space.xs
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
    marginBottom: space.md
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
    minHeight: sizing.tabMin,
    paddingBottom: space.md,
    paddingTop: space.sm,
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#CBD5E1",
    flexDirection: "row"
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs
  },
  tabLabel: {
    fontSize: 11,
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
