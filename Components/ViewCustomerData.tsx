import React, { useState, useMemo, useCallback } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDispatch } from "react-redux";
import { deleteCustomerThunk } from "../Redux/Slice";
import TransactionHandler from "./TransactionHandler";
import Sound from "react-native-sound";

Sound.setCategory("Playback");

// ─── Audio Helpers ────────────────────────────────────────────────────────────

function playSound(soundFile: string) {
  try {
    const sound = new Sound(soundFile, Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log("Sound playback error:", error);
        return;
      }
      sound.play(() => sound.release());
    });
  } catch (err) {
    console.log("Sound setup error:", err);
  }
}

function formatDate(isoString: string) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 1: Extract TransactionCard into its own component so hooks (useRef,
// useEffect) are called at the top level of a component — not inside a
// useCallback. Calling hooks inside a callback violates the Rules of Hooks
// and causes a runtime error.
// ─────────────────────────────────────────────────────────────────────────────

type TransactionCardProps = {
  item: any;
  index: number;
  customerName: string;
  balanceBefore: number; // net balance just before this transaction
  balanceAfter: number;  // net balance just after this transaction
};

function formatTime(isoString: string) {
  if (!isoString) return "";
  const d = new Date(isoString);
  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, "0")}:${mins} ${ampm}`;
}

function TransactionCard({ item, index, customerName, balanceBefore, balanceAfter }: TransactionCardProps) {
  const isGiven = item.type === "given";

  // Balance label: balanceAfter = running total after this tx
  // Positive = we gave more than received = Due from customer
  // Negative = we received more than gave = Advance (overpaid)
  const balanceLabel =
    balanceAfter > 0
      ? `Due ₹${Math.abs(balanceAfter).toLocaleString()}`
      : balanceAfter < 0
      ? `Advance ₹${Math.abs(balanceAfter).toLocaleString()}`
      : "Settled ₹0";

  const balanceLabelColor =
    balanceAfter > 0 ? "#ff6b6b" : balanceAfter < 0 ? "#51cf66" : "rgba(255,255,255,0.4)";

  return (
    <View style={[Styles.txRow, isGiven ? Styles.txRowGiven : Styles.txRowReceived]}>
      {/* Chat bubble */}
      <View style={[Styles.txBubble, isGiven ? Styles.txBubbleGiven : Styles.txBubbleReceived]}>
        {/* Arrow tip */}
        <View style={[Styles.txTip, isGiven ? Styles.txTipGiven : Styles.txTipReceived]} />

        {/* Amount row with arrow icon */}
        <View style={Styles.txAmountRow}>
          <Text style={[Styles.txArrowIcon, isGiven ? Styles.txArrowGiven : Styles.txArrowReceived]}>
            {isGiven ? "↑" : "↓"}
          </Text>
          <Text style={[Styles.txAmount, isGiven ? Styles.txAmountTextGiven : Styles.txAmountTextReceived]}>
            ₹{Number(item.amount).toLocaleString()}
          </Text>
          <Text style={Styles.txTime}>{formatTime(item.date)} ✓</Text>
        </View>

        {/* Note */}
        {item.note && item.note !== "No note" ? (
          <Text style={Styles.txNote}>{item.note}</Text>
        ) : null}
      </View>

      {/* Balance below bubble */}
      <Text style={[Styles.txBalanceBelow, isGiven ? Styles.txBalanceBelowGiven : Styles.txBalanceBelowReceived, { color: balanceLabelColor }]}>
        {balanceLabel}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ViewCustomerData({ route, navigation }) {
  const dispatch = useDispatch();

  const [customerMeta] = useState({
    _id: route.params.customer._id,
    name: route.params.customer.name,
    customerPhone: route.params.customer.customerPhone ?? route.params.customer.phone,
    address: route.params.customer.address ?? "",
  });

  // Transactions are mutable — live in their own state variable
  const [transactions, setTransactions] = useState<any[]>(
    route.params.customer.transactions ?? []
  );

  const [showModal, setShowModal] = useState(false);
  const [transactionType, setTransType] = useState<"given" | "received">("given");

  React.useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // ── Derived totals ─────────────────────────────────────────────────────────
  const { totalGiven, totalReceived, netBalance } = useMemo(() => {
    let given = 0, received = 0;
    transactions.forEach((t) => {
      if (t.type === "given") given += t.amount;
      else received += t.amount;
    });
    return { totalGiven: given, totalReceived: received, netBalance: given - received };
  }, [transactions]);

  // ── Callback: called by TransactionHandler on success ─────────────────────
  const handleTransactionAdded = useCallback((newTransaction: any) => {
    playSound("success_chime.mp3");
    // Append at end — list is oldest→newest so new tx goes to bottom
    setTransactions((prev) => [...prev, newTransaction]);
  }, []);

  const handleTransaction = (type: "given" | "received") => {
    setTransType(type);
    setShowModal(true);
  };

  // ── Delete customer ────────────────────────────────────────────────────────
  const handleDeleteCustomer = async () => {
    Alert.alert(
      "Delete Customer",
      `Are you sure you want to permanently delete ${customerMeta.name}'s khata? All transaction history will be lost.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const token = await AsyncStorage.getItem("token");
            const result = await dispatch(
              deleteCustomerThunk({ authToken: token, customerId: customerMeta._id })
            );
            if (deleteCustomerThunk.fulfilled.match(result)) {
              playSound('delete.mp3');
              setTimeout(() => navigation.goBack(), 500);
            } else {
              Alert.alert("Error", result.payload || "Failed to delete customer");
              playSound("error_sound.mp3");
            }
          },
        },
      ]
    );
  };

  // ── Running balance per transaction ───────────────────────────────────────
  // Transactions array may be newest-first from server. We sort oldest→newest
  // so the list always reads chronologically top→bottom, and new transactions
  // are always appended at the bottom consistently.
  const transactionsWithBalance = useMemo(() => {
    // Sort by date ascending (oldest first)
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let running = 0;
    return sorted.map((t) => {
      running += t.type === "given" ? t.amount : -t.amount;
      return { ...t, balanceBefore: running - (t.type === "given" ? t.amount : -t.amount), balanceAfter: running };
    });
  }, [transactions]);
  const renderTransaction = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      // Date separator: show if first item or different date from the previous (older) item
      const currDate = item.date ? new Date(item.date).toDateString() : null;
      const prevItem = transactionsWithBalance[index - 1]; // list is oldest-first
      const prevDate = prevItem?.date ? new Date(prevItem.date).toDateString() : null;
      const showDateSep = index === 0 || (currDate && currDate !== prevDate);

      return (
        <>
          {showDateSep && (
            <View style={Styles.dateSepRow}>
              <View style={Styles.dateSepLine} />
              <View style={Styles.dateSepPill}>
                <Text style={Styles.dateSepText}>{formatDate(item.date)}</Text>
              </View>
              <View style={Styles.dateSepLine} />
            </View>
          )}
          <TransactionCard
            item={item}
            index={index}
            customerName={customerMeta.name}
            balanceBefore={item.balanceBefore}
            balanceAfter={item.balanceAfter}
          />
        </>
      );
    },
    [customerMeta.name, transactionsWithBalance]
  );

  const keyExtractor = useCallback(
    (item: any, idx: number) => item._id ?? idx.toString(),
    []
  );

  return (
    <SafeAreaView style={Styles.container}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={Styles.headerSection}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={Styles.backBtn}>
          <Text style={Styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <View style={Styles.customerHeader}>
          <View style={Styles.avatarLarge}>
            <Text style={Styles.avatarTextLarge}>
              {customerMeta.name[0].toUpperCase()}
            </Text>
          </View>
          <View style={Styles.customerHeaderInfo}>
            <Text style={Styles.customerNameLarge} numberOfLines={1}>
              {customerMeta.name}
            </Text>
            <Text style={Styles.customerPhoneLarge}>📱 {customerMeta.customerPhone}</Text>
            {customerMeta.address && (
              <Text style={Styles.customerAddressLarge} numberOfLines={1}>
                📍 {customerMeta.address}
              </Text>
            )}
          </View>
          {/* Fix 5: Delete button inline with customer info */}
          <TouchableOpacity onPress={handleDeleteCustomer} style={Styles.deleteCustomerBtn}>
            <Text style={Styles.deleteCustomerIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Balance summary cards ────────────────────────────────────────────── */}
      <View style={Styles.summarySection}>
        <View style={[Styles.summaryCard, Styles.summaryCardGiven]}>
          <Text style={Styles.summaryLabel}>Total Given</Text>
          <Text style={[Styles.summaryAmount, Styles.summaryAmountGiven]}>
            ₹{totalGiven.toLocaleString()}
          </Text>
        </View>

        <View style={[Styles.summaryCard, Styles.summaryCardReceived]}>
          <Text style={Styles.summaryLabel}>Total Received</Text>
          <Text style={[Styles.summaryAmount, Styles.summaryAmountReceived]}>
            ₹{totalReceived.toLocaleString()}
          </Text>
        </View>

        <View
          style={[
            Styles.summaryCard,
            Styles.summaryCardNet,
            netBalance >= 0 ? Styles.netPositive : Styles.netNegative,
          ]}
        >
          <Text style={Styles.summaryLabel}>Balance</Text>
          <Text
            style={[
              Styles.summaryAmount,
              netBalance >= 0 ? Styles.netBalancePos : Styles.netBalanceNeg,
            ]}
          >
            {netBalance >= 0 ? "↑" : "↓"} ₹{Math.abs(netBalance).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* ── Transaction list ──────────────────────────────────────────────── */}
      <View style={Styles.txSection}>
        <View style={Styles.txSectionHeader}>
          <Text style={Styles.sectionTitle}>💳 Transactions</Text>
          <View style={Styles.txCountBadge}>
            <Text style={Styles.txCountText}>{transactions.length}</Text>
          </View>
        </View>

        <FlatList
          data={transactionsWithBalance}
          keyExtractor={keyExtractor}
          renderItem={renderTransaction}
          contentContainerStyle={Styles.listContent}
          scrollEnabled={transactions.length > 3}
          ListEmptyComponent={
            <View style={Styles.emptyState}>
              <Text style={Styles.emptyIcon}>📝</Text>
              <Text style={Styles.emptyText}>No transactions yet</Text>
              <Text style={Styles.emptySubtext}>Tap a button below to add one</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* ── Action buttons ─────────────────────────────────────────────────── */}
      <View style={Styles.actionButtons}>
        <TouchableOpacity
          style={[Styles.actionBtn, Styles.receivedBtn]}
          onPress={() => handleTransaction("received")}
          activeOpacity={0.75}
        >
          <Text style={Styles.actionBtnIcon}>📥</Text>
          <Text style={Styles.actionBtnText}>Money Received</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[Styles.actionBtn, Styles.givenBtn]}
          onPress={() => handleTransaction("given")}
          activeOpacity={0.75}
        >
          <Text style={Styles.actionBtnIcon}>📤</Text>
          <Text style={Styles.actionBtnText}>Money Given</Text>
        </TouchableOpacity>
      </View>

      <TransactionHandler
        showModal={showModal}
        setShowModal={setShowModal}
        transactionType={transactionType}
        customer={customerMeta}
        onTransactionAdded={handleTransactionAdded}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const Styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1419" },

  // ── Header ─────────────────────────────────────────────────────────────────
  headerSection: {
    // FIX 2: React Native does not support CSS gradient strings as
    // backgroundColor. Replaced with the gradient's start color (#667eea).
    // To get a true gradient, use a library like react-native-linear-gradient.
    backgroundColor: "#667eea",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  backBtn: { marginBottom: 10 },
  backBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  customerHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 10 },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarTextLarge: { fontSize: 24, fontWeight: "800", color: "#fff" },
  customerHeaderInfo: { flex: 1 },
  customerNameLarge: { fontSize: 17, fontWeight: "800", color: "#fff", marginBottom: 2 },
  customerPhoneLarge: { fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 1 },
  customerAddressLarge: { fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 1 },
  deleteCustomerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(231,76,60,0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(231,76,60,0.5)",
  },
  deleteCustomerIcon: { fontSize: 18 },

  // ── Summary Cards ──────────────────────────────────────────────────────────
  summarySection: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  summaryCardGiven: {
    backgroundColor: "rgba(231,76,60,0.15)",
    borderColor: "rgba(231,76,60,0.4)",
  },
  summaryCardReceived: {
    backgroundColor: "rgba(39,174,96,0.15)",
    borderColor: "rgba(39,174,96,0.4)",
  },
  summaryCardNet: {
    backgroundColor: "rgba(52,152,219,0.15)",
    borderColor: "rgba(52,152,219,0.4)",
  },
  netPositive: {
    borderColor: "rgba(39,174,96,0.6)",
    backgroundColor: "rgba(39,174,96,0.2)",
  },
  netNegative: {
    borderColor: "rgba(231,76,60,0.6)",
    backgroundColor: "rgba(231,76,60,0.2)",
  },
  summaryLabel: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.6)", marginBottom: 6 },
  summaryAmount: { fontSize: 16, fontWeight: "800" },
  summaryAmountGiven: { color: "#ff6b6b" },
  summaryAmountReceived: { color: "#51cf66" },
  netBalancePos: { color: "#51cf66" },
  netBalanceNeg: { color: "#ff6b6b" },

  // ── Transaction Section ────────────────────────────────────────────────────
  txSection: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
  txSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#fff" },
  txCountBadge: {
    backgroundColor: "#667eea",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(102,126,234,0.5)",
  },
  txCountText: { fontSize: 11, fontWeight: "800", color: "#fff" },
  listContent: { paddingBottom: 10 },

  // ── WhatsApp-style Transaction Bubbles ────────────────────────────────────
  txRow: {
    marginBottom: 14,
    paddingHorizontal: 10,
  },
  txRowReceived: {
    alignItems: "flex-start",  // Left side
  },
  txRowGiven: {
    alignItems: "flex-end",    // Right side
  },

  txBubble: {
    maxWidth: "72%",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: "relative",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  txBubbleReceived: {
    backgroundColor: "#1e2d24",
    borderTopLeftRadius: 2,
    borderWidth: 1,
    borderColor: "rgba(39,174,96,0.3)",
  },
  txBubbleGiven: {
    backgroundColor: "#1a2533",
    borderTopRightRadius: 2,
    borderWidth: 1,
    borderColor: "rgba(231,76,60,0.3)",
  },

  // Triangle tip
  txTip: {
    position: "absolute",
    top: 0,
    width: 0,
    height: 0,
    borderStyle: "solid",
  },
  txTipReceived: {
    left: -8,
    borderTopWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: "rgba(39,174,96,0.3)",
    borderRightColor: "transparent",
  },
  txTipGiven: {
    right: -8,
    borderTopWidth: 10,
    borderLeftWidth: 10,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopColor: "rgba(231,76,60,0.3)",
    borderLeftColor: "transparent",
  },

  txAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  txArrowIcon: {
    fontSize: 18,
    fontWeight: "900",
  },
  txArrowReceived: { color: "#51cf66" },
  txArrowGiven: { color: "#ff6b6b" },
  txAmount: { fontSize: 20, fontWeight: "800" },
  txAmountTextGiven: { color: "#ffffff" },
  txAmountTextReceived: { color: "#ffffff" },
  txTime: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    marginLeft: 4,
    alignSelf: "flex-end",
    marginBottom: 1,
  },
  txNote: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    marginTop: 4,
  },

  // Balance shown below each bubble
  txBalanceBelow: {
    fontSize: 12,
    marginTop: 4,
    marginHorizontal: 4,
    color: "rgba(255,255,255,0.45)",
  },
  txBalanceBelowReceived: { alignSelf: "flex-start" },
  txBalanceBelowGiven: { alignSelf: "flex-end" },

  // ── Date Separator ─────────────────────────────────────────────────────────
  dateSepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    paddingHorizontal: 10,
    gap: 8,
  },
  dateSepLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  dateSepPill: {
    backgroundColor: "#2a3a4a",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  dateSepText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "600",
  },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  emptySubtext: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 6 },

  // ── Action buttons ─────────────────────────────────────────────────────────
  actionButtons: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 2,
  },
  givenBtn: {
    backgroundColor: "rgba(231,76,60,0.15)",
    borderColor: "rgba(231,76,60,0.5)",
  },
  receivedBtn: {
    backgroundColor: "rgba(39,174,96,0.15)",
    borderColor: "rgba(39,174,96,0.5)",
  },
  actionBtnIcon: { fontSize: 18 },
  actionBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});