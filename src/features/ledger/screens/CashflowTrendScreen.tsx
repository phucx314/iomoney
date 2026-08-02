import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CashflowTrendPoint } from "../../../domain/types";
import { compactVnd, formatSignedVnd } from "../../../shared/format";
import { space, styles, theme } from "../../../shared/styles";

type CashflowRange = "6" | "12" | "all";

type CashflowTrendScreenProps = {
  trend: CashflowTrendPoint[];
  onBack: () => void;
  scrollOffset: number;
  onScrollOffsetChange: (offset: number) => void;
};

const RANGE_OPTIONS: CashflowRange[] = ["6", "12", "all"];

export function CashflowTrendScreen({ trend, onBack, scrollOffset, onScrollOffsetChange }: CashflowTrendScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [range, setRange] = useState<CashflowRange>("12");
  const visibleTrend = useMemo(() => {
    const rows = range === "all" ? trend : trend.slice(-Number(range));
    return [...rows].reverse();
  }, [range, trend]);
  const totals = useMemo(() => summarizeTrend(visibleTrend), [visibleTrend]);
  const maxFlow = Math.max(1, ...visibleTrend.flatMap((point) => [point.cashIn, point.cashOut]));
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScrollOffsetChange(event.nativeEvent.contentOffset.y);
  };

  useEffect(() => {
    const timeout = setTimeout(() => scrollRef.current?.scrollTo({ y: scrollOffset, animated: false }), 0);
    return () => clearTimeout(timeout);
  }, [scrollOffset]);

  return (
    <View style={styles.content}>
      <View style={styles.secondaryHeader}>
        <Pressable style={styles.pageBackButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.secondaryHeaderTitle} numberOfLines={1}>
          Cashflow trend
        </Text>
        <View style={styles.secondaryHeaderSpacer} />
      </View>
      <ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={[styles.contentPad, { paddingBottom: space.pageBottom + insets.bottom }]}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        <View style={styles.debtFilterRow}>
          {RANGE_OPTIONS.map((option) => {
            const active = option === range;
            return (
              <Pressable key={option} style={[styles.debtFilterChip, active && styles.debtFilterChipActive]} onPress={() => setRange(option)}>
                <Text style={[styles.debtFilterText, active && styles.debtFilterTextActive]}>{rangeLabel(option)}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.metricGrid}>
          <TrendStat label="Cash in" value={totals.cashIn} tone="income" />
          <TrendStat label="Cash out" value={-totals.cashOut} tone="expense" />
          <TrendStat label="Net" value={totals.net} tone={totals.net >= 0 ? "income" : "expense"} />
          <TrendStat label="Avg. net" value={totals.averageNet} tone={totals.averageNet >= 0 ? "income" : "expense"} />
        </View>

        <Text style={[styles.sectionTitle, styles.sectionTitleBlock, styles.sectionTitleSpaced]}>Monthly comparison</Text>
        <View style={styles.graphPanel}>
          {visibleTrend.length === 0 ? (
            <Text style={styles.muted}>No cashflow data yet.</Text>
          ) : (
            visibleTrend.map((point) => <CashflowMonthRow key={point.month} point={point} maxFlow={maxFlow} />)
          )}
        </View>

        <View style={[styles.graphSignalPanel, styles.panelSpaced]}>
          <Ionicons name="sparkles-outline" size={20} color={theme.colors.accent} />
          <View style={styles.flex}>
            <Text style={styles.graphSignalTitle}>{totals.signalTitle}</Text>
            <Text style={styles.graphSignalText}>{totals.signalText}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function TrendStat({ label, value, tone }: { label: string; value: number; tone: "income" | "expense" }) {
  return (
    <View style={styles.trendStatCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, tone === "income" ? styles.amountIncome : styles.amountExpense]} numberOfLines={1}>
        {formatSignedVnd(value)}
      </Text>
    </View>
  );
}

function CashflowMonthRow({ point, maxFlow }: { point: CashflowTrendPoint; maxFlow: number }) {
  return (
    <View style={styles.cashflowDetailRow}>
      <View style={styles.cashflowDetailHeader}>
        <Text style={styles.rowTitle}>{monthLabel(point.month)}</Text>
        <Text style={[styles.graphCategoryValue, point.net >= 0 ? styles.amountIncome : styles.amountExpense]}>{formatSignedVnd(point.net)}</Text>
      </View>
      <View style={styles.cashflowDetailBars}>
        <View style={styles.cashflowDetailTrack}>
          <View style={[styles.cashflowDetailBar, styles.cashflowBarIncome, { width: `${percent(point.cashIn, maxFlow)}%` }]} />
        </View>
        <View style={styles.cashflowDetailTrack}>
          <View style={[styles.cashflowDetailBar, styles.cashflowBarExpense, { width: `${percent(point.cashOut, maxFlow)}%` }]} />
        </View>
      </View>
      <View style={styles.cashflowDetailMetaRow}>
        <Text style={styles.rowMeta}>In {compactVnd(point.cashIn)}</Text>
        <Text style={styles.rowMeta}>Out {compactVnd(point.cashOut)}</Text>
        <Text style={styles.rowMeta}>{point.count} records</Text>
      </View>
    </View>
  );
}

function summarizeTrend(trend: CashflowTrendPoint[]) {
  const cashIn = trend.reduce((sum, point) => sum + point.cashIn, 0);
  const cashOut = trend.reduce((sum, point) => sum + point.cashOut, 0);
  const net = cashIn - cashOut;
  const averageNet = trend.length > 0 ? Math.round(net / trend.length) : 0;
  const best = [...trend].sort((a, b) => b.net - a.net)[0];
  const worst = [...trend].sort((a, b) => a.net - b.net)[0];

  if (!best || !worst) {
    return {
      cashIn,
      cashOut,
      net,
      averageNet,
      signalTitle: "Waiting for data",
      signalText: "Add or import records to compare monthly cashflow."
    };
  }

  return {
    cashIn,
    cashOut,
    net,
    averageNet,
    signalTitle: net >= 0 ? "Cashflow is positive" : "Cashflow is negative",
    signalText: `Best month: ${monthLabel(best.month)} (${formatSignedVnd(best.net)}). Weakest month: ${monthLabel(worst.month)} (${formatSignedVnd(worst.net)}).`
  };
}

function rangeLabel(range: CashflowRange) {
  if (range === "all") return "All";
  return `${range}M`;
}

function monthLabel(month: string) {
  const [year, mm] = month.split("-");
  return `${Number(mm)}/${year}`;
}

function percent(value: number, max: number) {
  if (value <= 0) return 0;
  return Math.max(2, Math.round((value / max) * 100));
}
