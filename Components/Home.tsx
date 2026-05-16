import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCustomers, fetchProfile } from "../Redux/Slice";
import NetInfo from "@react-native-community/netinfo";

export default function Home({ navigation }) {
  const dispatch = useDispatch();
  const { customerData: customers, customersLoading, userName, profilePic } = useSelector(
    (state) => state.authOperations
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null); // FIXED: removed <Date | null> TS annotation
  const [isRefreshing, setIsRefreshing] = useState(false);
  const retryIntervalRef = useRef(null);   // FIXED: removed <ReturnType<typeof setInterval> | null> TS annotation
  const tokenRef = useRef(null);           // FIXED: removed <string | null> TS annotation
  const initializedRef = useRef(false);

  const loadData = useCallback(async (token, silent = false) => {  // FIXED: removed TS type annotation
    if (!silent) setIsRefreshing(true);
    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) { setIsOnline(false); return; }
      setIsOnline(true);
      await dispatch(fetchCustomers(token));
      setLastRefreshed(new Date());
    } catch (_) {
      setIsOnline(false);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, [dispatch]);

  const startRetryLoop = useCallback((token) => {  // FIXED: removed TS type annotation
    if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
    retryIntervalRef.current = setInterval(async () => {
      const net = await NetInfo.fetch();
      if (net.isConnected) {
        setIsOnline(true);
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
        await loadData(token, true);  // FIXED: clearInterval pehle, phir loadData — race condition avoid
      }
    }, 2000);
  }, [loadData]);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem("token");
      if (!token) { navigation.replace("Login"); return; }
      tokenRef.current = token;

      const profileResult = await dispatch(fetchProfile(token));
      if (fetchProfile.fulfilled.match(profileResult) && profileResult.payload?.hasPin) {
        navigation.replace("AppLock");
        return;
      }

      initializedRef.current = true;
      const net = await NetInfo.fetch();
      if (net.isConnected) {
        setIsOnline(true);
        await dispatch(fetchCustomers(token));
        setLastRefreshed(new Date());
      } else {
        setIsOnline(false);
        startRetryLoop(token);
      }
    })();

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!initializedRef.current || !tokenRef.current) return;
      if (state.isConnected) {
        setIsOnline(true);
        if (retryIntervalRef.current) {
          clearInterval(retryIntervalRef.current);
          retryIntervalRef.current = null;
        }
        loadData(tokenRef.current, true);
      } else {
        setIsOnline(false);
        startRetryLoop(tokenRef.current);
      }
    });

    return () => {
      unsubscribe();
      if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
    };
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q));
  }, [searchQuery, customers]);

  const { totalGiven, totalReceived, netBalance } = useMemo(() => {
    let given = 0, received = 0;
    customers.forEach((c) => {
      (c.transactions || []).forEach((t) => {
        if (t.type === "given") given += t.amount;
        else received += t.amount;
      });
    });
    return { totalGiven: given, totalReceived: received, netBalance: given - received };
  }, [customers]);

  const renderCustomer = ({ item }) => {
    let cGiven = 0, cReceived = 0;
    (item.transactions || []).forEach((t) => {
      if (t.type === "given") cGiven += t.amount;
      else cReceived += t.amount;
    });
    const net = cGiven - cReceived;

    return (
      <TouchableOpacity
        style={Styles.customerCard}
        onPress={() => navigation.navigate("ViewCustomerData", { customer: item })}
        activeOpacity={0.82}
      >
        <View style={Styles.avatarContainer}>
          <Text style={Styles.avatar}>{item.name[0].toUpperCase()}</Text>
        </View>
        <View style={Styles.customerInfo}>
          <Text style={Styles.customerName}>{item.name}</Text>
          <Text style={Styles.customerPhone}>{item.customerPhone || item.phone}</Text>
        </View>
        <View style={[
          Styles.balanceBox,
          net > 0 ? Styles.balancePositive : net < 0 ? Styles.balanceNegative : null
        ]}>
          <Text style={[
            Styles.balanceLabel,
            net > 0 ? Styles.balanceLabelPos : net < 0 ? Styles.balanceLabelNeg : Styles.balanceLabelNeutral
          ]}>
            {net > 0 ? "OWES" : net < 0 ? "YOU OWE" : "SETTLED"}
          </Text>
          <Text style={[
            Styles.balanceAmount,
            net > 0 ? Styles.balanceLabelPos : net < 0 ? Styles.balanceLabelNeg : Styles.balanceLabelNeutral
          ]}>
            ₹{Math.abs(net).toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={Styles.container}>
      {/* Header */}
      <View style={Styles.header}>
        <View style={Styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Settings")}
            activeOpacity={0.85}
          >
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={Styles.headerAvatar} />
            ) : (
              <View style={Styles.headerAvatarPlaceholder}>
                <Text style={Styles.headerAvatarText}>
                  {userName ? userName[0].toUpperCase() : "?"}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={Styles.headerNameBlock}>
            <Text style={Styles.greeting}>Welcome back 👋</Text>
            <Text style={Styles.headerName} numberOfLines={1}>
              {userName || null}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate("Settings")}
          style={Styles.settingsBtn}
          activeOpacity={0.85}
        >
          <Text style={Styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Offline Banner */}
      {!isOnline && (
        <View style={Styles.offlineBanner}>
          <Text style={Styles.offlineBannerIcon}>📡</Text>
          <Text style={Styles.offlineBannerText}>No internet · Retrying automatically…</Text>
          <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 6 }} />
        </View>
      )}

      {/* Summary Row */}
      <View style={Styles.summaryRow}>
        <View style={[Styles.summaryCard, Styles.givenCard]}>
          <Text style={Styles.summaryLabel}>Total Given</Text>
          <Text style={Styles.summaryAmount}>₹{totalGiven.toLocaleString()}</Text>
        </View>
        <View style={[Styles.summaryCard, Styles.receivedCard]}>
          <Text style={Styles.summaryLabel}>Total Received</Text>
          <Text style={Styles.summaryAmount}>₹{totalReceived.toLocaleString()}</Text>
        </View>
        <View style={[Styles.summaryCard, Styles.netCard]}>
          <Text style={Styles.summaryLabel}>Net Balance</Text>
          <Text style={[Styles.summaryAmount, netBalance >= 0 ? Styles.netPos : Styles.netNeg]}>
            ₹{Math.abs(netBalance).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={Styles.searchContainer}>
        <Text style={Styles.searchIcon}>🔍</Text>
        <TextInput
          placeholder="Search customers…"
          placeholderTextColor="#aaa"
          style={Styles.searchBox}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Text style={Styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Section header */}
      <View style={Styles.listHeader}>
        <View>
          <Text style={Styles.listHeaderText}>
            Customers{customers.length > 0 ? ` (${customers.length})` : ""}
          </Text>
          {lastRefreshed && (
            <Text style={Styles.lastRefreshedText}>
              Last synced: {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[Styles.refreshBtn, isRefreshing && Styles.refreshBtnDisabled]}
          onPress={() => tokenRef.current && loadData(tokenRef.current)}
          disabled={isRefreshing}
          activeOpacity={0.75}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color="#3498db" />
          ) : (
            <Text style={Styles.refreshBtnIcon}>🔄</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* List */}
      {customersLoading ? (
        <View style={Styles.loaderContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={Styles.loaderText}>Loading customers…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item, index) => item._id || index.toString()}
          renderItem={renderCustomer}
          contentContainerStyle={Styles.listContent}
          ListEmptyComponent={
            <View style={Styles.emptyState}>
              <Text style={Styles.emptyIcon}>👥</Text>
              <Text style={Styles.emptyText}>No customers yet</Text>
              <Text style={Styles.emptySubtext}>Tap + to add your first customer</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={Styles.fab}
        onPress={() => navigation.navigate("AddCustomer")}
        activeOpacity={0.88}
      >
        <Text style={Styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const Styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4f8" },
  header: {
    backgroundColor: "#3498db",
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
  },
  headerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  headerAvatarText: { fontSize: 18, fontWeight: "800", color: "#fff" },
  headerNameBlock: { flex: 1 },
  greeting: { fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "600", marginBottom: 1 },
  headerName: { fontSize: 17, fontWeight: "800", color: "#fff" },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  settingsIcon: { fontSize: 18 },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  givenCard: { backgroundColor: "#fdecea" },
  receivedCard: { backgroundColor: "#e8f8f0" },
  netCard: { backgroundColor: "#eaf4fb" },
  summaryLabel: { fontSize: 10, fontWeight: "700", color: "#7f8c8d", letterSpacing: 0.4 },
  summaryAmount: { fontSize: 15, fontWeight: "800", color: "#1a2533", marginTop: 4 },
  netPos: { color: "#27ae60" },
  netNeg: { color: "#e74c3c" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e0e6ed",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchBox: { flex: 1, color: "#1a2533", fontSize: 15, paddingVertical: 11 },
  searchClear: { fontSize: 16, color: "#aaa", paddingLeft: 8 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loaderText: { fontSize: 14, color: "#7f8c8d" },
  listContent: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 4 },
  customerCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  avatarContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#3498db",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatar: { fontSize: 18, fontWeight: "800", color: "#fff" },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 15, fontWeight: "700", color: "#1a2533" },
  customerPhone: { fontSize: 12, color: "#7f8c8d", marginTop: 3 },
  balanceBox: {
    alignItems: "flex-end",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 72,
  },
  balancePositive: { backgroundColor: "#e8f8f0" },
  balanceNegative: { backgroundColor: "#fdecea" },
  balanceLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 0.4 },
  balanceAmount: { fontSize: 14, fontWeight: "800", marginTop: 2 },
  balanceLabelPos: { color: "#27ae60" },
  balanceLabelNeg: { color: "#e74c3c" },
  balanceLabelNeutral: { color: "#7f8c8d" },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e74c3c",
    paddingHorizontal: 16,
    paddingVertical: 9,
    gap: 8,
  },
  offlineBannerIcon: { fontSize: 14 },
  offlineBannerText: { flex: 1, fontSize: 12, fontWeight: "700", color: "#fff" },
  listHeader: {
    paddingHorizontal: 18,
    paddingBottom: 6,
    paddingTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listHeaderText: { fontSize: 13, fontWeight: "700", color: "#7f8c8d", letterSpacing: 0.3 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#eaf4fb",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#c5dff0",
  },
  refreshBtnDisabled: { opacity: 0.5 },
  refreshBtnIcon: { fontSize: 16 },
  lastRefreshedText: { fontSize: 10, color: "#aab8c2", marginTop: 1 },
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 17, fontWeight: "700", color: "#1a2533" },
  emptySubtext: { fontSize: 13, color: "#7f8c8d", marginTop: 6 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#3498db",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#3498db",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  fabText: { fontSize: 30, color: "#fff", fontWeight: "700", lineHeight: 34 },
});