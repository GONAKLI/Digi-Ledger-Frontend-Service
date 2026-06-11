import React, { useState, useMemo, useCallback } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  Alert,
  StatusBar,
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

// Fixed Date String to standard format
function formatDate(isoString: string) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatTime(isoString: string) {
  if (!isoString) return "";
  const d = new Date(isoString);
  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, "0")}:${mins} ${ampm}`;
}

// ─── Transaction Card Component ────────────────────────────────────────────────

type TransactionCardProps = {
  item: any;
  index: number;
  customerName: string;
  balanceBefore: number;
  balanceAfter: number;
};

const TransactionCard = React.memo(({ item, balanceAfter }: TransactionCardProps) => {
  const isGiven = item.type === "given";

  const balanceLabel =
    balanceAfter > 0
      ? `Due ₹${Math.abs(balanceAfter).toLocaleString()}`
      : balanceAfter < 0
      ? `Advance ₹${Math.abs(balanceAfter).toLocaleString()}`
      : "Settled";

  const balanceLabelColor =
    balanceAfter > 0 ? "#DC2626" : balanceAfter < 0 ? "#16A34A" : "#64748B";

  return (
    <View style={item.type ==="received" ? Styles.txRowReceived : Styles.txRowGiven}>
      {/* Visual Timeline Dot & Line */}
      <View style={Styles.timelineContainer}>
        <View style={[Styles.timelineDot, isGiven ? Styles.dotGiven : Styles.dotReceived]} />
        <View style={Styles.timelineVerticalLine} />
      </View>

      {/* Main Card Render Block */}
      <View style={Styles.txContentContainer}>
        <View style={Styles.txDetailsBlock}>
          <Text style={Styles.txTimeText}>{formatTime(item.date)}</Text>
          {item.note && item.note !== "No note" ? (
            <Text style={Styles.txNoteText} numberOfLines={2}>{item.note}</Text>
          ) : (
            <Text style={Styles.txNoNoteText}>No Description Provided</Text>
          )}
          <Text style={[Styles.txRunningBalance, { color: balanceLabelColor }]}>
            {balanceLabel}
          </Text>
        </View>

        {/* Amount Actions Right hand block */}
        <View style={Styles.txAmountBlock}>
          <Text style={[Styles.txAmountText, isGiven ? Styles.textNeg : Styles.textPos]}>
            {isGiven ? "-" : "+"} ₹{Number(item.amount).toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );
});

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ViewCustomerData({ route, navigation }) {
  const dispatch = useDispatch();

  const [customerMeta] = useState({
    _id: route.params.customer._id,
    name: route.params.customer.name,
    customerPhone: route.params.customer.customerPhone ?? route.params.customer.phone,
    address: route.params.customer.address ?? "",
  });

  const [transactions, setTransactions] = useState<any[]>(
    route.params.customer.transactions ?? []
  );

  const [showModal, setShowModal] = useState(false);
  const [transactionType, setTransType] = useState<"given" | "received">("given");

  React.useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const { totalGiven, totalReceived, netBalance } = useMemo(() => {
    let given = 0, received = 0;
    transactions.forEach((t) => {
      if (t.type === "given") given += t.amount;
      else received += t.amount;
    });
    return { totalGiven: given, totalReceived: received, netBalance: received - given };
  }, [transactions]);

  const handleTransactionAdded = useCallback((newTransaction: any) => {
    playSound("success_chime.mp3");
    setTransactions((prev) => [...prev, newTransaction]);
  }, []);

  const handleTransaction = (type: "given" | "received") => {
    setTransType(type);
    setShowModal(true);
  };

  const handleDeleteCustomer = async () => {
    Alert.alert(
      `Delete Customer --> ${customerMeta.name}`,
      `No Way To Recover This Customer After This.  `,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Ledger",
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

  const transactionsWithBalance = useMemo(() => {
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let running = 0;
    return sorted.map((t) => {
      running += t.type === "given" ? t.amount : -t.amount;
      return { 
        ...t, 
        balanceBefore: running - (t.type === "given" ? t.amount : -t.amount), 
        balanceAfter: running 
      };
    });
  }, [transactions]);

  const renderTransaction = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const currDate = item.date ? new Date(item.date).toDateString() : null;
      const prevItem = transactionsWithBalance[index - 1];
      const prevDate = prevItem?.date ? new Date(prevItem.date).toDateString() : null;
      const showDateSep = index === 0 || (currDate && currDate !== prevDate);

      return (
        <>
          {showDateSep && (
            <View style={Styles.dateSepRow}>
              <Text style={Styles.dateSepText}>{formatDate(item.date)}</Text>
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={Styles.headerSection}>
        <View style={Styles.topHeaderActionRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={Styles.backBtn}>
            <Text style={Styles.backBtnText}>← Ledger</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleDeleteCustomer} style={Styles.deleteCustomerBtn} activeOpacity={0.7}>
            <Text style={Styles.deleteCustomerIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>

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
            {customerMeta.address ? (
              <Text style={Styles.customerAddressLarge} numberOfLines={1}>
                📍 {customerMeta.address}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* ── Balance Summary Section ────────────────────────────────────────── */}
      <View style={Styles.summarySection}>
        {/* <View style={[Styles.summaryCard, Styles.summaryCardGiven]}>
          <Text style={Styles.summaryLabel}>Total Given</Text>
          <Text style={[Styles.summaryAmount, Styles.textNeg]}>
            ₹{totalGiven.toLocaleString()}
          </Text>
        </View>

        <View style={[Styles.summaryCard, Styles.summaryCardReceived]}>
          <Text style={Styles.summaryLabel}>Received</Text>
          <Text style={[Styles.summaryAmount, Styles.textPos]}>
            ₹{totalReceived.toLocaleString()}
          </Text>
        </View> */}

        <View style={[Styles.summaryCard, Styles.summaryCardNet, netBalance >= 0 ? Styles.netCardPos : Styles.netCardNeg]}>
          <Text style={Styles.summaryLabel}>Net Balance</Text>
          <Text style={[Styles.summaryAmount, netBalance >= 0 ? Styles.textPos : Styles.textNeg]}>
            ₹{Math.abs(netBalance).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* ── Transaction List ──────────────────────────────────────────────── */}
      <View style={Styles.txSection}>
        <View style={Styles.txSectionHeader}>
          <Text style={Styles.sectionTitle}>Transaction Timeline</Text>
          <View style={Styles.txCountBadge}>
            <Text style={Styles.txCountText}>{transactions.length} entries</Text>
          </View>
        </View>

        <FlatList
          data={transactionsWithBalance}
          keyExtractor={keyExtractor}
          renderItem={renderTransaction}
          contentContainerStyle={Styles.listContent}
          ListEmptyComponent={
            <View style={Styles.emptyState}>
              <Text style={Styles.emptyIcon}>📝</Text>
              <Text style={Styles.emptyText}>No ledger entries yet</Text>
              <Text style={Styles.emptySubtext}>Use actions below to commit transactions</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* ── Action Buttons ─────────────────────────────────────────────────── */}
      <View style={Styles.actionButtons}>
        <TouchableOpacity
          style={[Styles.actionBtn, Styles.receivedBtn]}
          onPress={() => handleTransaction("received")}
          activeOpacity={0.8}
        >
          <Text style={Styles.actionBtnText}>+ Got Money</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[Styles.actionBtn, Styles.givenBtn]}
          onPress={() => handleTransaction("given")}
          activeOpacity={0.8}
        >
          <Text style={Styles.actionBtnText}>- Gave Money</Text>
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
// HIGH-FIDELITY MILKY GREY UI STYLES
// ─────────────────────────────────────────────────────────────────────────────

const Styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" }, // Soft Milky Greyish Base

  // Header System (Optimized & Sized Down)
  headerSection: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  topHeaderActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  backBtn: { paddingVertical: 4 },
  backBtnText: { color: "#64748B", fontSize: 13, fontWeight: "600" }, // Sized Down
  customerHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarLarge: {
    width: 48, // Sized Down
    height: 48, // Sized Down
    borderRadius: 24,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  avatarTextLarge: { fontSize: 18, fontWeight: "700", color: "#475569" }, // Sized Down
  customerHeaderInfo: { flex: 1 },
  customerNameLarge: { fontSize: 16, fontWeight: "700", color: "#0F172A", letterSpacing: 0.1 }, // Sized Down
  customerPhoneLarge: { fontSize: 11, color: "#64748B", marginTop: 2 }, // Sized Down
  customerAddressLarge: { fontSize: 11, color: "#94A3B8", marginTop: 1 }, // Sized Down
  deleteCustomerBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  deleteCustomerIcon: { fontSize: 14 },

  // Summary Cards Rows (Light Variants)
  summarySection: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: -12, 
    marginBottom: 14,
  },
  summaryCard: {
    marginTop:2,
    flex: 1,
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryCardGiven: { borderLeftWidth: 3, borderLeftColor: "#EF4444" },
  summaryCardReceived: { borderLeftWidth: 3, borderLeftColor: "#10B981" },
  summaryCardNet: { borderLeftWidth: 3 },
  netCardPos: { borderLeftColor: "#10B981" },
  netCardNeg: { borderLeftColor: "#EF4444" },
  summaryLabel: { fontSize: 9, fontWeight: "600", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.4, textAlign:"center", textAlignVertical:"center" },
  summaryAmount: { fontSize: 13, fontWeight: "700", marginTop: 2, textAlign:"center", textAlignVertical:"center" },
  textPos: { color: "#16A34A" }, // High Contrast Green
  textNeg: { color: "#DC2626" }, // High Contrast Red

  // Transactions View Structure
  txSection: { flex: 1, paddingHorizontal: 16 },
  txSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#475569", letterSpacing: 0.1 },
  txCountBadge: {
    backgroundColor: "#E2E8F0",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  txCountText: { fontSize: 10, fontWeight: "600", color: "#64748B" },
  listContent: { paddingBottom: 20 },

  // Interactive Timeline Setup
  // txRow: {
  //   flexDirection: "row",
  //   marginBottom: 2,
  // },
   txRowReceived: {
    flexDirection: "row",
    marginBottom: 3,
    backgroundColor:"#87f6c2"
  }, txRowGiven: {
    flexDirection: "row",
    marginBottom: 3,
    backgroundColor:"#f486c6"
  },


  timelineContainer: {
    alignItems: "center",
    width: 20,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 14,
    zIndex: 2,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
  },
  dotGiven: { backgroundColor: "#EF4444" },
  dotReceived: { backgroundColor: "#10B981" },
  timelineVerticalLine: {
    flex: 1,
    width: 1.5,
    backgroundColor: "#CBD5E1",
    marginVertical: 2,
  },
  txContentContainer: {

    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    marginLeft: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  txDetailsBlock: { flex: 1, paddingRight: 6 },
  txTimeText: { fontSize: 10, color: "#94A3B8", fontWeight: "500" },
  txNoteText: { fontSize: 13, color: "#1E293B", marginTop: 3, fontWeight: "400" },
  txNoNoteText: { fontSize: 12, color: "#94A3B8", marginTop: 3, fontStyle: "italic" },
  txRunningBalance: { fontSize: 11, fontWeight: "600", marginTop: 4 },
  txAmountBlock: { alignItems: "flex-end", justifyContent: "center" },
  txAmountText: { fontSize: 15, fontWeight: "700" },

  // Linear Date Separators
  dateSepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
    gap: 8,
  },
  dateSepText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  dateSepLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#CBD5E1",
  },

  // Fallback Empty Screen
  emptyState: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 32, marginBottom: 8, opacity: 0.5 },
  emptyText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  emptySubtext: { fontSize: 12, color: "#94A3B8", marginTop: 2, textAlign: "center" },

  // Fixed Actions CTA Footer
  actionButtons: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  receivedBtn: {
    backgroundColor: "#16A34A", 
  },
  givenBtn: {
    backgroundColor: "#DC2626", 
  },
  actionBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
});