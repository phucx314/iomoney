import { StyleSheet } from "react-native";
import { AppTheme, darkTheme, lightTheme, radius, sizing, space } from "./designSystem";
import { fontFamily } from "./typography";

export { AppTheme, AppThemeMode, radius, sizing, space } from "./designSystem";

function createStyles(appTheme: AppTheme) {
  const c = appTheme.colors;

  return StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: c.shell
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
    height: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    backgroundColor: c.surface,
    overflow: "visible"
  },
  headerCharacter: {
    position: "absolute",
    left: 7,
    bottom: -7,
    width: 104,
    height: 86,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2
  },
  headerCharacterImage: {
    width: 104,
    height: 86
  },
  headerGreeting: {
    position: "absolute",
    left: 130,
    bottom: 12,
    right: 72,
    color: c.text,
    fontSize: 18,
    fontFamily: fontFamily.extraBold,
    zIndex: 2
  },
  headerActions: {
    position: "absolute",
    right: space.lg,
    bottom: 0,
    zIndex: 3
  },
  headerIconButton: {
    backgroundColor: "transparent"
  },
  headerNotificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 17,
    height: 17,
    borderRadius: radius.round,
    borderWidth: 2,
    borderColor: c.categoryStroke,
    backgroundColor: c.expense,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xxs
  },
  headerNotificationBadgeText: {
    color: c.onSignal,
    fontSize: 10,
    fontFamily: fontFamily.extraBold
  },
  secondaryHeader: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    backgroundColor: c.surface
  },
  secondaryHeaderTitle: {
    flex: 1,
    textAlign: "center",
    color: c.text,
    fontSize: 17,
    fontFamily: fontFamily.extraBold
  },
  secondaryHeaderSpacer: {
    width: sizing.iconButton,
    height: sizing.iconButton
  },
  iconButton: {
    width: sizing.iconButton,
    height: sizing.iconButton,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.control
  },
  content: {
    flex: 1,
    backgroundColor: c.background
  },
  contentPad: {
    padding: space.lg,
    paddingBottom: space.pageBottom
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fontFamily.extraBold,
    color: c.text
  },
  sectionTitleBlock: {
    marginBottom: space.md,
  },
  sectionTitleSpaced: {
    marginTop: space.xxl
  },
  pageTitleRow: {
    minHeight: sizing.row,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginBottom: space.md
  },
  pageBackButton: {
    width: 38,
    height: 38,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  pageMetaTight: {
    marginBottom: -space.sm
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
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
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
    borderBottomColor: c.border
  },
  multiOptionActive: {
    backgroundColor: c.selection
  },
  multiOptionText: {
    flex: 1,
    color: c.text,
    fontSize: 14,
    fontFamily: fontFamily.bold
  },
  multiEmpty: {
    color: c.muted,
    fontSize: 13,
    fontFamily: fontFamily.regular,
    padding: space.md
  },
  metric: {
    flexBasis: "45%",
    flexGrow: 1,
    minHeight: 96,
    borderRadius: radius.xl,
    padding: space.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border
  },
  metricHeader: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: space.sm
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
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
    flex: 1,
    fontSize: 12,
    color: c.muted,
    fontFamily: fontFamily.bold,
    textTransform: "uppercase"
  },
  metricValue: {
    marginTop: space.md,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: fontFamily.extraBold
  },
  panel: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.border,
    padding: space.lg
  },
  panelSpaced: {
    marginTop: space.lg
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
  panelLinkRow: {
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    marginTop: space.sm
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
    borderColor: c.categoryStroke,
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
    backgroundColor: c.control,
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
    borderBottomColor: c.border
  },
  txListItemLast: {
    borderBottomWidth: 0
  },
  txListItemSelected: {
    backgroundColor: c.selection
  },
  listSelectionMark: {
    width: 22,
    height: 22,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: c.borderStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  listSelectionMarkActive: {
    borderColor: c.accent,
    backgroundColor: c.accent
  },
  listTextButton: {
    minHeight: sizing.control,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border
  },
  listTextButtonText: {
    color: c.accent,
    fontSize: 13,
    fontFamily: fontFamily.extraBold
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
    color: c.text,
    fontFamily: fontFamily.bold
  },
  rowMeta: {
    marginTop: space.xs,
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: c.muted
  },
  amountExpense: {
    color: c.expense,
    fontFamily: fontFamily.extraBold,
    fontSize: 13
  },
  amountIncome: {
    color: c.income,
    fontFamily: fontFamily.extraBold,
    fontSize: 13
  },
  muted: {
    color: c.muted,
    fontSize: 13,
    fontFamily: fontFamily.regular
  },
  empty: {
    textAlign: "center",
    marginTop: sizing.iconButton,
    color: c.muted,
    fontFamily: fontFamily.regular
  },
  filterPanel: {
    padding: space.lg,
    backgroundColor: c.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    gap: space.md
  },
  filterButton: {
    minHeight: 52,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md
  },
  filterButtonLabel: {
    color: c.muted,
    fontSize: 11,
    fontFamily: fontFamily.extraBold,
    textTransform: "uppercase"
  },
  filterButtonValue: {
    color: c.text,
    fontSize: 14,
    fontFamily: fontFamily.extraBold,
    marginTop: space.xxs
  },
  selectionToolbar: {
    minHeight: sizing.control,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm
  },
  bulkTitle: {
    flex: 1,
    color: c.text,
    fontSize: 14,
    fontFamily: fontFamily.extraBold
  },
  bulkCancelButton: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: space.sm
  },
  bulkCancel: {
    color: c.accent,
    fontSize: 13,
    fontFamily: fontFamily.extraBold
  },
  searchBox: {
    height: sizing.search,
    borderRadius: radius.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderStrong,
    paddingHorizontal: space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: c.text
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
    backgroundColor: c.surface,
    paddingVertical: 0,
    position: "relative"
  },
  transactionListContent: {
    flexGrow: 1
  },
  ledgerSummaryRow: {
    flexDirection: "row",
    gap: space.sm,
    marginTop: space.md
  },
  ledgerSummaryItem: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    justifyContent: "center"
  },
  ledgerSummaryLabel: {
    color: c.muted,
    fontSize: 11,
    fontFamily: fontFamily.bold,
    textTransform: "uppercase",
    marginBottom: space.xs
  },
  ledgerBottomCue: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -1,
    height: 98,
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
    borderColor: c.floatingBorder,
    backgroundColor: c.floatingSurface,
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
    borderColor: c.floatingBorder,
    backgroundColor: c.floatingSurface,
    paddingHorizontal: space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    elevation: 0,
    zIndex: 4
  },
  ledgerTopButtonText: {
    color: c.text,
    fontSize: 13,
    fontFamily: fontFamily.extraBold
  },
  listFooter: {
    textAlign: "center",
    color: c.muted,
    fontSize: 12,
    fontFamily: fontFamily.bold,
    paddingVertical: space.lg
  },
  debtFilterRow: {
    flexDirection: "row",
    gap: space.sm,
    marginBottom: space.md
  },
  debtFilterChip: {
    minHeight: 38,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
    paddingHorizontal: space.md,
    alignItems: "center",
    justifyContent: "center"
  },
  debtFilterChipActive: {
    borderColor: c.accent,
    backgroundColor: c.accent
  },
  debtFilterText: {
    color: c.text,
    fontSize: 13,
    fontFamily: fontFamily.extraBold
  },
  debtFilterTextActive: {
    color: c.onAccent
  },
  debtRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border
  },
  debtRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md
  },
  debtRowActions: {
    alignItems: "center",
    gap: space.xs
  },
  debtPaymentButton: {
    width: 38,
    height: 38,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: "center",
    justifyContent: "center"
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
    borderColor: c.border,
    backgroundColor: c.surface,
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
    color: c.text,
    fontSize: 14,
    fontFamily: fontFamily.bold,
    lineHeight: 20
  },
  notificationTime: {
    color: c.muted,
    fontSize: 12,
    fontFamily: fontFamily.regular,
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
    padding: space.xs,
    borderRadius: radius.lg,
    backgroundColor: c.control,
    flexDirection: "row",
    gap: space.xxs
  },
  segmentChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.sm
  },
  segmentChipActive: {
    backgroundColor: c.segmentActive
  },
  segmentText: {
    color: c.subtle,
    fontSize: 13,
    fontFamily: fontFamily.extraBold
  },
  segmentTextActive: {
    color: c.onAccent
  },
  selectButton: {
    minHeight: sizing.control,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
    paddingHorizontal: space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md
  },
  selectText: {
    flex: 1,
    color: c.text,
    fontSize: 15,
    fontFamily: fontFamily.bold
  },
  dropdownOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: c.overlay
  },
  dropdownSheet: {
    maxHeight: "72%",
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: c.surface,
    overflow: "hidden"
  },
  dropdownHeader: {
    minHeight: sizing.sheetHeader,
    paddingHorizontal: space.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border
  },
  dropdownTitle: {
    fontSize: 17,
    color: c.text,
    fontFamily: fontFamily.extraBold
  },
  dropdownOption: {
    minHeight: 50,
    paddingHorizontal: space.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border
  },
  dropdownOptionActive: {
    backgroundColor: c.selection
  },
  dropdownOptionText: {
    flex: 1,
    color: c.text,
    fontSize: 15,
    fontFamily: fontFamily.bold
  },
  dropdownOptionTextActive: {
    color: c.accent
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
    borderBottomColor: c.border
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
    color: c.text,
    fontSize: 15,
    fontFamily: fontFamily.extraBold
  },
  actionOptionTextDanger: {
    color: c.expense
  },
  confirmOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: space.xl,
    backgroundColor: c.confirmOverlay
  },
  confirmCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    padding: space.lg
  },
  confirmTitle: {
    color: c.text,
    fontSize: 18,
    fontFamily: fontFamily.extraBold
  },
  confirmMessage: {
    marginTop: space.sm,
    color: c.subtle,
    fontSize: 14,
    fontFamily: fontFamily.regular,
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
    backgroundColor: c.overlay
  },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: c.surface,
    overflow: "hidden"
  },
  sheetHandle: {
    width: sizing.iconButton,
    height: 5,
    borderRadius: radius.hairline,
    backgroundColor: c.controlStrong,
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
    borderBottomColor: c.border
  },
  sheetTitle: {
    flex: 1,
    fontSize: 17,
    color: c.text,
    fontFamily: fontFamily.extraBold
  },
  sheetHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs
  },
  sheetBody: {
    padding: space.lg
  },
  sheetFooter: {
    padding: space.lg,
    flexDirection: "row",
    gap: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border
  },
  detailHero: {
    minHeight: sizing.row,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginBottom: space.md
  },
  detailTitle: {
    color: c.text,
    fontSize: 17,
    fontFamily: fontFamily.extraBold,
    marginBottom: space.xs
  },
  detailRow: {
    minHeight: 42,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.lg,
    paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border
  },
  detailLabel: {
    color: c.muted,
    fontSize: 13,
    fontFamily: fontFamily.bold
  },
  detailValue: {
    flex: 1,
    color: c.text,
    textAlign: "right",
    fontSize: 13,
    fontFamily: fontFamily.bold
  },
  breakdownTotalRow: {
    borderTopColor: c.borderStrong
  },
  breakdownTotalLabel: {
    color: c.text,
    fontSize: 14,
    fontFamily: fontFamily.extraBold
  },
  breakdownTotalValueIncome: {
    color: c.income,
    fontSize: 14,
    fontFamily: fontFamily.extraBold
  },
  breakdownTotalValueExpense: {
    color: c.expense,
    fontSize: 14,
    fontFamily: fontFamily.extraBold
  },
  formulaPanel: {
    marginTop: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: c.surfaceSoft,
    gap: space.xs
  },
  formulaText: {
    color: c.muted,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fontFamily.regular
  },
  syncText: {
    fontSize: 16,
    fontFamily: fontFamily.extraBold,
    color: c.text
  },
  syncHint: {
    color: c.muted,
    fontFamily: fontFamily.regular,
    marginTop: space.sm,
    lineHeight: 20
  },
  syncStats: {
    flexDirection: "row",
    gap: space.sm,
    marginVertical: space.lg
  },
  syncActionStack: {
    marginTop: space.lg
  },
  settingsProfileRow: {
    minHeight: sizing.row,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md
  },
  settingsNavRow: {
    minHeight: sizing.row,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingBottom: space.md,
    marginBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border
  },
  settingsNavIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: c.accentSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  settingsAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.round,
    backgroundColor: c.accent,
    alignItems: "center",
    justifyContent: "center"
  },
  settingsAvatarText: {
    color: c.onAccent,
    fontSize: 18,
    fontFamily: fontFamily.extraBold
  },
  miniStat: {
    flex: 1,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: c.surfaceSoft
  },
  miniValue: {
    fontSize: 18,
    fontFamily: fontFamily.extraBold,
    color: c.text
  },
  miniLabel: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    color: c.muted,
    marginTop: space.xs
  },
  primaryButton: {
    minHeight: sizing.control,
    borderRadius: radius.lg,
    backgroundColor: c.accent,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.lg
  },
  primaryButtonText: {
    color: c.onAccent,
    fontFamily: fontFamily.extraBold
  },
  secondaryButton: {
    minHeight: sizing.control,
    borderRadius: radius.lg,
    backgroundColor: c.control,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.lg
  },
  secondaryButtonText: {
    color: c.text,
    fontFamily: fontFamily.extraBold
  },
  dangerButton: {
    minHeight: sizing.control,
    borderRadius: radius.lg,
    backgroundColor: c.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.lg
  },
  dangerButtonText: {
    color: c.dangerText,
    fontFamily: fontFamily.extraBold
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
    borderWidth: 1,
    borderColor: c.floatingBorder,
    backgroundColor: c.surface,
    flexDirection: "row",
    overflow: "hidden",
    elevation: 0
  },
  tabAddButton: {
    width: sizing.tabBase,
    height: sizing.tabBase,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: c.accent,
    backgroundColor: c.accent,
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
  speedDialOverlay: {
    flex: 1,
    backgroundColor: "transparent"
  },
  speedDialMenu: {
    position: "absolute",
    alignItems: "flex-end",
    gap: space.md
  },
  speedDialAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: space.sm
  },
  speedDialTextBox: {
    maxWidth: 230,
    minHeight: 48,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.floatingBorder,
    backgroundColor: c.surface,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    justifyContent: "center"
  },
  speedDialTitle: {
    color: c.text,
    fontSize: 14,
    fontFamily: fontFamily.extraBold
  },
  speedDialSubtitle: {
    marginTop: space.xxs,
    color: c.muted,
    fontSize: 12,
    fontFamily: fontFamily.regular
  },
  speedDialIcon: {
    width: 50,
    height: 50,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: c.accent,
    backgroundColor: c.accent,
    alignItems: "center",
    justifyContent: "center"
  },
  tabLabel: {
    fontSize: 10,
    color: c.muted,
    fontFamily: fontFamily.bold
  },
  tabLabelActive: {
    color: c.accent
  },
  modalShell: {
    flex: 1,
    backgroundColor: c.background
  },
  modalHeader: {
    height: sizing.modalHeader,
    paddingHorizontal: space.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: c.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border
  },
  modalTitle: {
    fontSize: 20,
    color: c.text,
    fontFamily: fontFamily.extraBold
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
    color: c.text,
    fontSize: 15,
    fontFamily: fontFamily.extraBold
  },
  categorySelectButton: {
    marginBottom: space.lg
  },
  suggestionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    marginTop: -space.sm,
    marginBottom: space.lg
  },
  suggestionChip: {
    maxWidth: "100%",
    minHeight: 34,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: space.md,
    alignItems: "center",
    justifyContent: "center"
  },
  suggestionText: {
    color: c.text,
    fontSize: 13,
    fontFamily: fontFamily.bold
  },
  amountInputRow: {
    minHeight: sizing.control,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden"
  },
  amountSignButton: {
    width: sizing.control,
    height: sizing.control,
    alignItems: "center",
    justifyContent: "center"
  },
  amountSignExpense: {
    backgroundColor: c.dangerSoft
  },
  amountSignIncome: {
    backgroundColor: c.accentSoft
  },
  amountSignText: {
    color: c.text,
    fontSize: 22,
    fontFamily: fontFamily.extraBold
  },
  amountInput: {
    flex: 1,
    minHeight: sizing.control,
    paddingHorizontal: space.md,
    color: c.text,
    fontSize: 17,
    fontFamily: fontFamily.extraBold
  },
  categoryCreatePanel: {
    marginTop: space.md,
    padding: space.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSoft
  },
  categoryIconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    marginBottom: space.md
  },
  categoryIconChoice: {
    width: 42,
    height: 42,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  categoryIconChoiceActive: {
    borderColor: c.accent,
    backgroundColor: c.accent
  },
  counterpartyChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm
  },
  counterpartyChip: {
    maxWidth: "100%",
    minHeight: 36,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: space.md,
    alignItems: "center",
    justifyContent: "center"
  },
  counterpartyChipActive: {
    borderColor: c.accent,
    backgroundColor: c.accent
  },
  counterpartyChipText: {
    color: c.text,
    fontSize: 13,
    fontFamily: fontFamily.extraBold
  },
  counterpartyChipTextActive: {
    color: c.onAccent
  },
  counterpartySuggestionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    marginTop: space.sm
  },
  counterpartyInputRow: {
    minHeight: sizing.control,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: space.md,
    paddingRight: space.xs,
    gap: space.sm
  },
  counterpartyInput: {
    flex: 1,
    minHeight: sizing.control,
    color: c.text,
    fontSize: 15,
    fontFamily: fontFamily.regular
  },
  counterpartyTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    minHeight: 34,
    borderRadius: radius.md,
    backgroundColor: c.accentSoft,
    paddingHorizontal: space.sm
  },
  counterpartyTypeButtonText: {
    color: c.accent,
    fontSize: 12,
    fontFamily: fontFamily.extraBold
  },
  debtAmountField: {
    marginTop: space.xs
  },
  reportGroupLocked: {
    marginBottom: space.lg
  },
  reportGroupLockedValue: {
    minHeight: sizing.control,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
    paddingHorizontal: space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm
  },
  reportGroupLockedText: {
    color: c.text,
    fontSize: 15,
    fontFamily: fontFamily.extraBold
  },
  debtNestedPanel: {
    marginBottom: space.lg,
    padding: space.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSoft
  },
  recurrencePanel: {
    padding: space.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
    marginBottom: space.lg
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fontFamily.extraBold,
    color: c.subtle,
    marginBottom: space.sm,
    textTransform: "uppercase"
  },
  input: {
    minHeight: sizing.control,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
    color: c.text,
    paddingHorizontal: space.md,
    fontSize: 15,
    fontFamily: fontFamily.regular
  },
  hint: {
    marginTop: space.xs,
    color: c.muted,
    fontSize: 12,
    fontFamily: fontFamily.regular
  },
  checkboxRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md
  },
  checkboxLabel: {
    color: c.text,
    fontFamily: fontFamily.bold
  },
  modalFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: space.lg,
    backgroundColor: c.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    flexDirection: "row",
    gap: space.md
  }
  });
}

export let theme = lightTheme;
export let styles = createStyles(theme);

export function setThemeStyles(isDark: boolean) {
  const nextTheme = isDark ? darkTheme : lightTheme;
  if (theme === nextTheme) return;
  theme = nextTheme;
  styles = createStyles(theme);
}
