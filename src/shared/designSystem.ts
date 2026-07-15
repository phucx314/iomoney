export type AppThemeMode = "system" | "light" | "dark";

export type AppTheme = {
  dark: boolean;
  colors: {
    shell: string;
    background: string;
    surface: string;
    surfaceSoft: string;
    control: string;
    controlStrong: string;
    border: string;
    borderStrong: string;
    text: string;
    muted: string;
    subtle: string;
    accent: string;
    accentSoft: string;
    onAccent: string;
    onSignal: string;
    income: string;
    expense: string;
    neutral: string;
    warning: string;
    warningSoft: string;
    danger: string;
    dangerSoft: string;
    dangerText: string;
    sync: string;
    syncSoft: string;
    selection: string;
    segmentActive: string;
    overlay: string;
    confirmOverlay: string;
    floatingSurface: string;
    floatingBorder: string;
    bottomCueStart: string;
    bottomCueEnd: string;
    categoryStroke: string;
    placeholder: string;
  };
};

export const lightTheme: AppTheme = {
  dark: false,
  colors: {
    shell: "#FFFFFF",
    background: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceSoft: "#F1F5F9",
    control: "#E2E8F0",
    controlStrong: "#CBD5E1",
    border: "#E2E8F0",
    borderStrong: "#CBD5E1",
    text: "#0F172A",
    muted: "#64748B",
    subtle: "#475569",
    accent: "#0F766E",
    accentSoft: "#ECFDF5",
    onAccent: "#FFFFFF",
    onSignal: "#FFFFFF",
    income: "#047857",
    expense: "#B91C1C",
    neutral: "#334155",
    warning: "#A16207",
    warningSoft: "#FEF3C7",
    danger: "#B91C1C",
    dangerSoft: "#FEE2E2",
    dangerText: "#991B1B",
    sync: "#0369A1",
    syncSoft: "#E0F2FE",
    selection: "#ECFDF5",
    segmentActive: "#0F766E",
    overlay: "rgba(15, 23, 42, 0.35)",
    confirmOverlay: "rgba(15, 23, 42, 0.42)",
    floatingSurface: "rgba(255, 255, 255, 0.96)",
    floatingBorder: "rgba(148, 163, 184, 0.45)",
    bottomCueStart: "rgba(255,255,255,0)",
    bottomCueEnd: "#FFFFFF",
    categoryStroke: "#FFFFFF",
    placeholder: "#94A3B8"
  }
};

export const darkTheme: AppTheme = {
  dark: true,
  colors: {
    shell: "#0B1120",
    background: "#0F172A",
    surface: "#111827",
    surfaceSoft: "#1E293B",
    control: "#1E293B",
    controlStrong: "#334155",
    border: "#263449",
    borderStrong: "#475569",
    text: "#F8FAFC",
    muted: "#94A3B8",
    subtle: "#CBD5E1",
    accent: "#2DD4BF",
    accentSoft: "#123B38",
    onAccent: "#042F2E",
    onSignal: "#FFFFFF",
    income: "#34D399",
    expense: "#F87171",
    neutral: "#CBD5E1",
    warning: "#FBBF24",
    warningSoft: "#3A2E10",
    danger: "#F87171",
    dangerSoft: "#451A1A",
    dangerText: "#FCA5A5",
    sync: "#38BDF8",
    syncSoft: "#082F49",
    selection: "#123B38",
    segmentActive: "#2DD4BF",
    overlay: "rgba(2, 6, 23, 0.68)",
    confirmOverlay: "rgba(2, 6, 23, 0.72)",
    floatingSurface: "rgba(17, 24, 39, 0.96)",
    floatingBorder: "rgba(100, 116, 139, 0.45)",
    bottomCueStart: "rgba(17,24,39,0)",
    bottomCueEnd: "#111827",
    categoryStroke: "#111827",
    placeholder: "#64748B"
  }
};

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
