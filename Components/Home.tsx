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
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCustomers, fetchProfile } from "../Redux/Slice";
import NetInfo from "@react-native-community/netinfo";

const CustomerItem = React.memo(({ item, onPress }) => {
  const net = useMemo(() => {
    let cGiven = 0, cReceived = 0;
    (item.transactions || []).forEach((t) => {
      if (t.type === "given") cGiven += t.amount;
      else cReceived += t.amount;
    });
    return cGiven - cReceived;
  }, [item.transactions]);

  return (
    <TouchableOpacity
      style={Styles.customerCard}
      onPress={() => onPress(item)}
      activeOpacity={0.82}
    >
      <View style={Styles.avatarContainer}>
        <Text style={Styles.avatar}>{item.name ? item.name[0].toUpperCase() : "?"}</Text>
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
});

export default function Home({ navigation }) {
  const dispatch = useDispatch();
  
  // FIX: Read 'unlocked' variable precisely as matching your Redux Slice state
  const { 
    customerData: customers = [], 
    customersLoading, 
    userName, 
    profilePic,
    unlocked 
  } = useSelector((state) => state.authOperations);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const retryIntervalRef = useRef(null);
  const tokenRef = useRef(null);
  const initializedRef = useRef(false);

  const loadData = useCallback(async (token, silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) { 
        setIsOnline(false); 
        return; 
      }
      setIsOnline(true);
      await dispatch(fetchCustomers(token));
      setLastRefreshed(new Date());
    } catch (_) {
      setIsOnline(false);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, [dispatch]);

  const startRetryLoop = useCallback((token) => {
    if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
    retryIntervalRef.current = setInterval(async () => {
      const net = await NetInfo.fetch();
      if (net.isConnected) {
        setIsOnline(true);
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
        await loadData(token, true);
      }
    }, 2000);
  }, [loadData]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const token = await AsyncStorage.getItem("token");
      if (!token) { 
        navigation.replace("Login"); 
        return; 
      }
      if (!isMounted) return;
      tokenRef.current = token;

      const profileResult = await dispatch(fetchProfile(token));
      
      // FIX CONDITION: Evaluates 'unlocked' from state reducer block cleanly
      if (
        fetchProfile.fulfilled.match(profileResult) && 
        profileResult.payload?.hasPin && 
        !unlocked
      ) {
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
      isMounted = false;
      unsubscribe();
      if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
    };
  }, [dispatch, loadData, startRetryLoop, unlocked]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter((c) => c.name?.toLowerCase().includes(q));
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

  const handleCustomerPress = useCallback((item) => {
    navigation.navigate("ViewCustomerData", { customer: item });
  }, [navigation]);

  const renderCustomer = useCallback(({ item }) => (
    <CustomerItem item={item} onPress={handleCustomerPress} />
  ), [handleCustomerPress]);

  return (
    <SafeAreaView style={Styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header Minimalized Layout */}
      <View style={Styles.header}>
        <View style={Styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.navigate("Settings")} activeOpacity={0.85}>
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

        <TouchableOpacity onPress={() => navigation.navigate("Settings")} style={Styles.settingsBtn} activeOpacity={0.85}>
          <Text style={Styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {!isOnline && (
        <View style={Styles.offlineBanner}>
          <Text style={Styles.offlineBannerIcon}>📡</Text>
          <Text style={Styles.offlineBannerText}>No internet · Retrying automatically…</Text>
          <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 6 }} />
        </View>
      )}

      {/* Metrics Row Grid styled to match light grey contrast updates */}
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

      <View style={Styles.searchContainer}>
        <Text style={Styles.searchIcon}>🔍</Text>
        <TextInput
          placeholder="Search customers…"
          placeholderTextColor="#94A3B8"
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
            <ActivityIndicator size="small" color="#4F46E5" />
          ) : (
            <Text style={Styles.refreshBtnIcon}>🔄</Text>
          )}
        </TouchableOpacity>
      </View>

      {customersLoading ? (
        <View style={Styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
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

      <TouchableOpacity style={Styles.fab} onPress={() => navigation.navigate("AddCustomer")} activeOpacity={0.88}>
        <Text style={Styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const Styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" }, // Sourced Milky Grey Theme
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0"
  },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    marginRight: 12,
  },
  headerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerAvatarText: { fontSize: 18, fontWeight: "700", color: "#fff" },
  headerNameBlock: { flex: 1 },
  greeting: { fontSize: 11, color: "#64748B", fontWeight: "500", marginBottom: 1 },
  headerName: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  settingsIcon: { fontSize: 16 },
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  givenCard: { borderLeftWidth: 3, borderLeftColor: "#EF4444" },
  receivedCard: { borderLeftWidth: 3, borderLeftColor: "#10B981" },
  netCard: { borderLeftWidth: 3, borderLeftColor: "#4F46E5" },
  summaryLabel: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.4 },
  summaryAmount: { fontSize: 14, fontWeight: "700", color: "#1E293B", marginTop: 4 },
  netPos: { color: "#16A34A" },
  netNeg: { color: "#DC2626" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchIcon: { fontSize: 16, marginRight: 8, opacity: 0.5 },
  searchBox: { flex: 1, color: "#0F172A", fontSize: 14, paddingVertical: 11 },
  searchClear: { fontSize: 16, color: "#94A3B8", paddingLeft: 8 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loaderText: { fontSize: 14, color: "#64748B" },
  listContent: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 4 },
  customerCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EEF2F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatar: { fontSize: 16, fontWeight: "700", color: "#475569" },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 15, fontWeight: "600", color: "#0F172A" },
  customerPhone: { fontSize: 12, color: "#64748B", marginTop: 3 },
  balanceBox: {
    alignItems: "flex-end",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 72,
  },
  balancePositive: { backgroundColor: "#DCFCE7" },
  balanceNegative: { backgroundColor: "#FEE2E2" },
  balanceLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 0.4 },
  balanceAmount: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  balanceLabelPos: { color: "#15803D" },
  balanceLabelNeg: { color: "#B91C1C" },
  balanceLabelNeutral: { color: "#64748B" },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
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
  listHeaderText: { fontSize: 11, fontWeight: "700", color: "#64748B", letterSpacing: 0.5 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  refreshBtnDisabled: { opacity: 0.5 },
  refreshBtnIcon: { fontSize: 14 },
  lastRefreshedText: { fontSize: 10, color: "#94A3B8", marginTop: 1 },
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12, opacity: 0.5 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#475569" },
  emptySubtext: { fontSize: 12, color: "#94A3B8", marginTop: 6 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  fabText: { fontSize: 28, color: "#fff", fontWeight: "400", lineHeight: 32 },
});