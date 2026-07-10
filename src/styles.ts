import { StyleSheet } from "react-native";

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
    gap: 12
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
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
    marginTop: 2,
    fontSize: 13,
    color: "#64748B"
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2E8F0"
  },
  notice: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0"
  },
  noticeText: {
    color: "#065F46",
    fontSize: 13
  },
  content: {
    flex: 1
  },
  contentPad: {
    padding: 16,
    paddingBottom: 104
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
    marginTop: 8
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  metric: {
    width: "48%",
    minHeight: 112,
    borderRadius: 8,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10
  },
  metricLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
    textTransform: "uppercase"
  },
  metricValue: {
    marginTop: 6,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800"
  },
  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 10
  },
  categoryRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  categoryIconBox: {
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  flowBadge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
    marginTop: 6,
    overflow: "hidden"
  },
  barFill: {
    height: 6,
    borderRadius: 3
  },
  txRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0"
  },
  rowTitle: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "700"
  },
  rowMeta: {
    marginTop: 4,
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
    marginTop: 44,
    color: "#64748B"
  },
  filterPanel: {
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0"
  },
  filterGrid: {
    gap: 10
  },
  searchBox: {
    height: 44,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A"
  },
  listPad: {
    paddingHorizontal: 16,
    paddingBottom: 104
  },
  selectWrap: {
    marginBottom: 10
  },
  selectButton: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
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
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: "#FFFFFF",
    overflow: "hidden"
  },
  dropdownHeader: {
    minHeight: 58,
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
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
  syncText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A"
  },
  syncHint: {
    color: "#64748B",
    marginTop: 6,
    lineHeight: 20
  },
  syncStats: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 14
  },
  miniStat: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
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
    marginTop: 3
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 10
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800"
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 10
  },
  secondaryButtonText: {
    color: "#0F172A",
    fontWeight: "800"
  },
  dangerButton: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 10
  },
  dangerButtonText: {
    color: "#991B1B",
    fontWeight: "800"
  },
  disabled: {
    opacity: 0.55
  },
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 72,
    paddingBottom: 12,
    paddingTop: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#CBD5E1",
    flexDirection: "row"
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4
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
    height: 64,
    paddingHorizontal: 18,
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
    padding: 16,
    paddingBottom: 120
  },
  field: {
    marginBottom: 14
  },
  categoryEditorHeader: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12
  },
  categoryPreview: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800"
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 6,
    textTransform: "uppercase"
  },
  input: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
    paddingHorizontal: 12,
    fontSize: 15
  },
  hint: {
    marginTop: 5,
    color: "#64748B",
    fontSize: 12
  },
  checkboxRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
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
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    gap: 10
  }
});
