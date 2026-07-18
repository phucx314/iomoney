import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  View
} from "react-native";
import { Transaction } from "../../../domain/types";
import { TransactionListItem as BaseTransactionListItem } from "../../../shared/components";
import { space, styles, theme } from "../../../shared/styles";

const TRANSACTION_PAGE_SIZE = 80;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type LedgerListProps = {
  transactions: Transaction[];
  selectedIds: number[];
  busy: boolean;
  bottomInset: number;
  scrollOffset: number;
  onOpenTransaction: (tx: Transaction) => void;
  onToggleSelection: (id: number) => void;
  onScrollOffsetChange: (offset: number) => void;
};

export function LedgerList({
  transactions,
  selectedIds,
  busy,
  bottomInset,
  scrollOffset,
  onOpenTransaction,
  onToggleSelection,
  onScrollOffsetChange
}: LedgerListProps) {
  const listRef = useRef<FlatList<Transaction>>(null);
  const arrowProgress = useRef(new Animated.Value(0)).current;
  const topButtonProgress = useRef(new Animated.Value(0)).current;
  const cueProgress = useRef(new Animated.Value(0)).current;
  const [visibleLimit, setVisibleLimit] = useState(TRANSACTION_PAGE_SIZE);
  const [currentScrollY, setCurrentScrollY] = useState(scrollOffset);
  const [listViewportHeight, setListViewportHeight] = useState(0);
  const [listContentHeight, setListContentHeight] = useState(0);
  const selectionMode = selectedIds.length > 0;
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleTransactions = useMemo(() => transactions.slice(0, visibleLimit), [transactions, visibleLimit]);
  const canLoadMore = visibleLimit < transactions.length;
  const hasScrollableContent = listContentHeight > listViewportHeight + space.xxl;
  const distanceFromEnd = listContentHeight - (currentScrollY + listViewportHeight);
  const isAtListEnd = listContentHeight > 0 && distanceFromEnd <= space.xxl;
  const showBottomGradient = hasScrollableContent && visibleTransactions.length > 0 && !isAtListEnd;
  const showBottomArrow = showBottomGradient && currentScrollY < space.xxl;
  const showBackToTop = currentScrollY > 520 && !isAtListEnd;

  const renderTransaction = useCallback(
    ({ item, index }: { item: Transaction; index: number }) => (
      <MemoTransactionListItem
        tx={item}
        selected={selectedIdSet.has(item.id)}
        disabled={busy}
        selectionMode={selectionMode}
        onOpenTransaction={onOpenTransaction}
        onToggleSelection={onToggleSelection}
        last={!canLoadMore && index === visibleTransactions.length - 1}
      />
    ),
    [busy, canLoadMore, onOpenTransaction, onToggleSelection, selectedIdSet, selectionMode, visibleTransactions.length]
  );

  const loadMoreTransactions = useCallback(() => {
    setVisibleLimit((current) => Math.min(current + TRANSACTION_PAGE_SIZE, transactions.length));
  }, [transactions.length]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const offsetY = Math.max(0, contentOffset.y);
    setCurrentScrollY(offsetY);
    setListContentHeight(contentSize.height);
    setListViewportHeight(layoutMeasurement.height);
    onScrollOffsetChange(offsetY);
  };

  const handleListLayout = (event: LayoutChangeEvent) => {
    setListViewportHeight(event.nativeEvent.layout.height);
  };

  const scrollToTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    setCurrentScrollY(0);
    onScrollOffsetChange(0);
  };

  useEffect(() => {
    setVisibleLimit(TRANSACTION_PAGE_SIZE);
  }, [transactions.length]);

  useEffect(() => {
    const timeout = setTimeout(() => listRef.current?.scrollToOffset({ offset: scrollOffset, animated: false }), 0);
    setCurrentScrollY(scrollOffset);
    return () => clearTimeout(timeout);
  }, [scrollOffset]);

  useEffect(() => {
    Animated.timing(cueProgress, {
      toValue: showBottomGradient ? 1 : 0,
      duration: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [cueProgress, showBottomGradient]);

  useEffect(() => {
    Animated.timing(arrowProgress, {
      toValue: showBottomArrow ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [arrowProgress, showBottomArrow]);

  useEffect(() => {
    Animated.timing(topButtonProgress, {
      toValue: showBackToTop ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [showBackToTop, topButtonProgress]);

  return (
    <View style={[styles.transactionListShell, { paddingBottom: space.pageBottom + bottomInset }]}>
      <View style={[styles.panel, styles.listPanel, styles.transactionListPanel]}>
        <FlatList
          ref={listRef}
          data={visibleTransactions}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.transactionListContent}
          renderItem={renderTransaction}
          initialNumToRender={14}
          maxToRenderPerBatch={12}
          updateCellsBatchingPeriod={50}
          windowSize={9}
          removeClippedSubviews
          onEndReached={canLoadMore ? loadMoreTransactions : undefined}
          onEndReachedThreshold={0.6}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          onLayout={handleListLayout}
          onContentSizeChange={(_width, height) => setListContentHeight(height)}
          ListHeaderComponent={<View style={styles.listSpacer} />}
          ListEmptyComponent={<Text style={styles.empty}>No matching transactions.</Text>}
          ListFooterComponent={
            <View>
              {canLoadMore ? (
                <Text style={styles.listFooter}>
                  Showing {visibleTransactions.length} of {transactions.length}
                </Text>
              ) : null}
              <View style={styles.listSpacer} />
            </View>
          }
        />
        {hasScrollableContent && visibleTransactions.length > 0 ? (
          <Animated.View pointerEvents="none" style={[styles.ledgerBottomCue, { opacity: cueProgress }]}>
            <LinearGradient colors={[theme.colors.bottomCueStart, theme.colors.bottomCueEnd]} style={styles.ledgerBottomGradient} />
            <Animated.View
              style={[
                styles.ledgerBottomArrow,
                {
                  opacity: arrowProgress,
                  transform: [
                    { translateY: arrowProgress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
                    { scale: arrowProgress.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }
                  ]
                }
              ]}
            >
              <Ionicons name="chevron-down" size={20} color={theme.colors.accent} />
            </Animated.View>
          </Animated.View>
        ) : null}
        <AnimatedPressable
          pointerEvents={showBackToTop ? "auto" : "none"}
          style={[
            styles.ledgerTopButton,
            {
              opacity: topButtonProgress,
              transform: [
                { translateY: topButtonProgress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                { scale: topButtonProgress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }
              ]
            }
          ]}
          onPress={scrollToTop}
        >
          <Ionicons name="arrow-up" size={17} color={theme.colors.text} />
          <Text style={styles.ledgerTopButtonText}>Top</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const MemoTransactionListItem = memo(function MemoTransactionListItem({
  tx,
  selected,
  disabled,
  selectionMode,
  onOpenTransaction,
  onToggleSelection,
  last
}: {
  tx: Transaction;
  selected: boolean;
  disabled: boolean;
  selectionMode: boolean;
  onOpenTransaction: (tx: Transaction) => void;
  onToggleSelection: (id: number) => void;
  last: boolean;
}) {
  const debtOnlyPayment = tx.ledgerRecordType === "debt_payment";
  const handlePress = useCallback(() => {
    if (selectionMode && !debtOnlyPayment) onToggleSelection(tx.id);
    else if (selectionMode) return;
    else onOpenTransaction(tx);
  }, [debtOnlyPayment, onOpenTransaction, onToggleSelection, selectionMode, tx]);
  const handleLongPress = useCallback(() => {
    if (!debtOnlyPayment) onToggleSelection(tx.id);
  }, [debtOnlyPayment, onToggleSelection, tx.id]);

  return (
    <BaseTransactionListItem
      tx={tx}
      selected={selected}
      disabled={disabled}
      selectionMode={selectionMode && !debtOnlyPayment}
      last={last}
      onPress={handlePress}
      onLongPress={debtOnlyPayment ? undefined : handleLongPress}
    />
  );
});
