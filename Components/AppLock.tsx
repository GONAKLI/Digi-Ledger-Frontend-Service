import { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Vibration,
  Animated,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDispatch, useSelector } from "react-redux";
import { verifyPinThunk, logout, unlockedPin } from "../Redux/Slice";

export default function AppLock({ navigation }) {
  const dispatch = useDispatch();
  const { loading } = useSelector((s) => s.authOperations);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockedOut, setLockedOut] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const MAX_ATTEMPTS = 5;

  const getToken = async () => {
    const t = await AsyncStorage.getItem("token");
    if (!t) throw new Error("Token not found");
    return t;
  };

  function shake() {
    Vibration.vibrate(200);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  async function handleLogoutAndRedirect() {
    try {
      await AsyncStorage.multiRemove(["token", "phone"]);
      dispatch(logout());
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      navigation.replace("Login");
    }
  }

  async function handleVerify(enteredPin) {
    if (isVerifying || lockedOut || enteredPin.length !== 4) return;
    setIsVerifying(true);

    try {
      const authToken = await getToken();
      const result = await dispatch(verifyPinThunk({ authToken, pin: enteredPin }));

      if (verifyPinThunk.fulfilled.match(result)) {
        setPin("");
        
        // FIX: Triggers matching your exact exported Redux reducer
        dispatch(unlockedPin());
        
        navigation.replace("Home");
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin("");
        shake();
        setIsVerifying(false);

        if (newAttempts >= MAX_ATTEMPTS) {
          setLockedOut(true);
          setError("Too many attempts. Logging out…");
          setTimeout(handleLogoutAndRedirect, 1500);
        } else {
          setError(`Incorrect PIN. ${MAX_ATTEMPTS - newAttempts} attempt(s) left.`);
        }
      }
    } catch (err) {
      console.error("PIN verification error:", err);
      setIsVerifying(false);
      setPin("");
      setError(err.message === "Token not found"
        ? "Session expired. Please log in again."
        : "Error verifying PIN. Please try again."
      );
      if (err.message === "Token not found") {
        setTimeout(handleLogoutAndRedirect, 1500);
      }
    }
  }

  function handleDigit(d) {
    if (lockedOut || isVerifying || pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError("");
    if (next.length === 4) handleVerify(next);
  }

  function handleDelete() {
    if (lockedOut || isVerifying) return;
    setPin((p) => p.slice(0, -1));
    setError("");
  }

  const dots = Array.from({ length: 4 });

  return (
    <View style={Styles.container}>
      <View style={Styles.topSection}>
        <View style={Styles.lockIcon}>
          <Text style={Styles.lockEmoji}>🔒</Text>
        </View>
        <Text style={Styles.title}>App Locked</Text>
        <Text style={Styles.subtitle}>Enter your 4-digit PIN to continue</Text>
      </View>

      <Animated.View style={[Styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
        {dots.map((_, i) => (
          <View
            key={i}
            style={[
              Styles.dot,
              i < pin.length ? Styles.dotFilled : null,
              error ? Styles.dotError : null,
            ]}
          />
        ))}
      </Animated.View>

      {error ? <Text style={Styles.errorText}>{error}</Text> : null}

      <View style={Styles.numpad}>
        {[["1","2","3"],["4","5","6"],["7","8","9"],["","0","⌫"]].map((row, ri) => (
          <View key={ri} style={Styles.numpadRow}>
            {row.map((digit, di) => (
              <TouchableOpacity
                key={di}
                style={[Styles.numKey, digit === "" && Styles.numKeyEmpty]}
                onPress={() => {
                  if (digit === "⌫") handleDelete();
                  else if (digit !== "") handleDigit(digit);
                }}
                disabled={digit === "" || loading || isVerifying || lockedOut}
                activeOpacity={0.7}
              >
                <Text style={Styles.numKeyText}>{digit}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={Styles.forgotBtn}
        onPress={() => {
          Alert.alert("Logout", "Are you sure you want to logout?", [
            { text: "Cancel", style: "cancel" },
            { text: "Logout", style: "destructive", onPress: handleLogoutAndRedirect },
          ]);
        }}
        disabled={loading || isVerifying || lockedOut}
      >
        <Text style={Styles.forgotText}>Forgot PIN? Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const Styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A2533",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  topSection: { alignItems: "center", marginBottom: 40 },
  lockIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  lockEmoji: { fontSize: 36 },
  title: { fontSize: 26, fontWeight: "800", color: "#fff", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.5)" },
  dotsRow: { flexDirection: "row", gap: 14, marginBottom: 14 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "transparent",
  },
  dotFilled: { backgroundColor: "#3498db", borderColor: "#3498db" },
  dotError: { borderColor: "#e74c3c", backgroundColor: "#e74c3c" },
  errorText: {
    color: "#e74c3c",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  numpad: { marginTop: 20, width: "100%" },
  numpadRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginBottom: 16,
  },
  numKey: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  numKeyEmpty: { backgroundColor: "transparent", borderColor: "transparent" },
  numKeyText: { fontSize: 22, fontWeight: "700", color: "#fff" },
  forgotBtn: { marginTop: 32, paddingVertical: 10 },
  forgotText: { fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: "500" },
});