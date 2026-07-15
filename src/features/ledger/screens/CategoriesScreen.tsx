import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CategorySummary, PeriodFilter } from "../../../domain/types";
import { CategoryIcon } from "../../../shared/components";
import { categoryColor, formatSignedVnd, monthLabel } from "../../../shared/format";
import { space, styles, theme } from "../../../shared/styles";

type CategoriesScreenProps = {
  period: PeriodFilter;
  categories: CategorySummary[];
  onBack: () => void;
  scrollOffset: number;
  onScrollOffsetChange: (offset: number) => void;
};

export function CategoriesScreen({ period, categories, onBack, scrollOffset, onScrollOffsetChange }: CategoriesScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const expenseCategories = categories.filter((item) => item.flow === "expense");
  const incomeCategories = categories.filter((item) => item.flow === "income");
  const periodLabel = period.mode === "month" ? monthLabel(period.month) : `${period.startDate} - ${period.endDate}`;
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
          Categories
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
        <Text style={[styles.rowMeta, styles.sectionTitleBlock]}>{periodLabel}</Text>
        <CategorySection title="Outcome" items={expenseCategories} flow="expense" />
        <CategorySection title="Income" items={incomeCategories} flow="income" />
      </ScrollView>
    </View>
  );
}

function CategorySection({ title, items, flow }: { title: string; items: CategorySummary[]; flow: "income" | "expense" }) {
  const maxAmount = Math.max(...items.map((item) => item.amount), 0);
  return (
    <>
      <Text style={[styles.sectionTitle, styles.sectionTitleBlock, styles.sectionTitleSpaced]}>{title}</Text>
      <View style={[styles.panel, styles.categoryPanel]}>
        {items.length === 0 ? (
          <Text style={styles.muted}>No category data in this period.</Text>
        ) : (
          items.map((item) => (
            <View key={`${flow}-${item.category}`} style={styles.categoryRow}>
              <CategoryIcon category={item.category} flow={flow} size={32} />
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{item.category}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        backgroundColor: categoryColor(item.category),
                        width: `${maxAmount > 0 ? Math.max(space.sm, (item.amount / maxAmount) * 100) : 0}%`
                      }
                    ]}
                  />
                </View>
              </View>
              <Text style={flow === "income" ? styles.amountIncome : styles.amountExpense}>
                {formatSignedVnd(flow === "income" ? item.amount : -item.amount)}
              </Text>
            </View>
          ))
        )}
      </View>
    </>
  );
}
