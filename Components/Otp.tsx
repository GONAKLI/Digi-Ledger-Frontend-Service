import { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  StatusBar,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import OtpModel from "../Modals/OtpModel";
import { validateOtp, clearError } from "../Redux/Slice";

export default function Otp({ navigation }) {
  const phone = useSelector((state) => state.authOperations.phone);
  const { loading, error } = useSelector((state) => state.authOperations);
  const dispatch = useDispatch();

  const [modelShow, setModelShow] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [val, setVal] = useState("");

  async function handleAuth() {
    if (val.length !== 6) {
      setErrorMessage("OTP must be exactly 6 digits");
      setModelShow(true);
      return;
    }

    const result = await dispatch(validateOtp({ phone, otp: val }));

    if (validateOtp.fulfilled.match(result)) {
      await AsyncStorage.setItem("token", result.payload.token);
      await AsyncStorage.setItem("phone", String(result.payload.phone));

      if (result.payload.isNewUser) {
        navigation.replace("FirstLoginName");
      } else {
        navigation.replace("Home");
      }
    } else {
      setErrorMessage(result.payload || "Invalid OTP. Please try again.");
      setModelShow(true);
    }
  }

  return (
    // ─── WHY THIS STRUCTURE ────────────────────────────────────────────────
    // The previous version had:
    //   KeyboardAvoidingView > ScrollView (flexGrow:1, justifyContent:"center")
    //
    // Problem: When the keyboard appears, KeyboardAvoidingView reduces the
    // available height. ScrollView then tries to re-center its content inside
    // the now-smaller frame, triggering a layout recalculation loop that
    // causes the visible "jumping" effect.
    //
    // Fix: Use a single KeyboardAvoidingView with behavior="padding" (iOS) or
    // behavior="height" (Android). Inside it, a ScrollView with NO
    // justifyContent:"center" — instead we use top padding on the content
    // container to push content down visually. This way the layout is
    // anchored from the top, and the keyboard simply pushes it up without
    // any centering recalculation loop.
    // ──────────────────────────────────────────────────────────────────────
    <KeyboardAvoidingView
      style={Styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      // keyboardVerticalOffset accounts for the status bar on iOS
      keyboardVerticalOffset={Platform.OS === "ios" ? StatusBar.currentHeight ?? 44 : 0}
    >
      <ScrollView
        style={Styles.flex}
        contentContainerStyle={Styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        // Prevent scroll view from bouncing back and triggering re-layouts
        bounces={false}
        overScrollMode="never"
      >
        {/* ── Illustration ── */}
        <View style={Styles.header}>
          <Text style={Styles.headerIcon}>🔐</Text>
          <Text style={Styles.title}>Verify OTP</Text>
          <Text style={Styles.subtitle}>
            Enter the 6-digit code sent to your phone
          </Text>
        </View>

        {/* ── Card ── */}
        <View style={Styles.card}>
          {/* Phone row */}
          <View style={Styles.phoneRow}>
            <View>
              <Text style={Styles.phoneLabel}>SENT TO</Text>
              <Text style={Styles.phoneNumber}>+91 {phone}</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                dispatch(clearError());
                navigation.replace("Login");
              }}
              style={Styles.editBtn}
            >
              <Text style={Styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* OTP input */}
          <Text style={Styles.otpLabel}>ENTER OTP</Text>
          <View style={[Styles.otpInputWrapper, val.length > 0 && Styles.otpInputActive]}>
            <TextInput
              style={Styles.otpInput}
              keyboardType="number-pad"
              maxLength={6}
              value={val}
              onChangeText={(text) => {
                setVal(text);
                setErrorMessage("");
                dispatch(clearError());
              }}
              placeholder="• • • • • •"
              placeholderTextColor="#c8d0d8"
              returnKeyType="done"
              onSubmitEditing={handleAuth}
            />
          </View>

          {errorMessage ? (
            <Text style={Styles.errorText}>⚠️ {errorMessage}</Text>
          ) : null}

          <View style={Styles.infoBox}>
            <Text style={Styles.infoText}>
              ℹ️ OTP expires in 10 minutes. Check your messages if it doesn't arrive shortly.
            </Text>
          </View>

          <TouchableOpacity
            style={[Styles.verifyButton, loading && Styles.verifyButtonDisabled]}
            onPress={handleAuth}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={Styles.verifyText}>
              {loading ? "Verifying…" : "Verify OTP →"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={Styles.resendButton}
            onPress={() => Alert.alert("Info", "Resend functionality coming soon")}
          >
            <Text style={Styles.resendText}>Didn't get the code? Resend OTP</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom padding so the card doesn't sit flush against the keyboard */}
        <View style={Styles.bottomSpacer} />
      </ScrollView>

      <OtpModel
        modelShow={modelShow}
        setModelShow={setModelShow}
        message={errorMessage}
      />
    </KeyboardAvoidingView>
  );
}

const Styles = StyleSheet.create({
  // ── Root ─────────────────────────────────────────────────────────────────
  // flex:1 on both KAV and ScrollView means they fill the screen together.
  // No backgroundColor on KAV — put it on ScrollView so the bg fills even
  // when KAV shrinks.
  flex: {
    flex: 1,
    backgroundColor: "#f0f4f8",
  },

  // ── Scroll content ────────────────────────────────────────────────────────
  // KEY CHANGE: No flexGrow + justifyContent:"center" here.
  // Instead we use paddingTop to push the content into a nice vertical
  // position. This is a static value — it doesn't change when the keyboard
  // appears, so the layout is completely stable.
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,   // push content down from top
    paddingBottom: 24,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  headerIcon: { fontSize: 48, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: "800", color: "#1a2533", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#7f8c8d", textAlign: "center", lineHeight: 20 },

  // ── Card ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  phoneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f0f4f8",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  phoneLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#7f8c8d",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  phoneNumber: { fontSize: 16, fontWeight: "700", color: "#1a2533" },
  editBtn: {
    backgroundColor: "#dbeeff",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  editBtnText: { color: "#3498db", fontWeight: "700", fontSize: 13 },
  otpLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1a2533",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  otpInputWrapper: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e0e6ed",
    marginBottom: 10,
  },
  otpInputActive: { borderColor: "#3498db" },
  otpInput: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a2533",
    textAlign: "center",
    paddingVertical: 14,
    letterSpacing: 12,
  },
  errorText: {
    color: "#e74c3c",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: "#eaf6ff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  infoText: { fontSize: 12, color: "#2c6e99", lineHeight: 18, fontWeight: "500" },
  verifyButton: {
    backgroundColor: "#3498db",
    borderRadius: 12,
    paddingVertical: 15,
    elevation: 3,
    shadowColor: "#3498db",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  verifyButtonDisabled: { backgroundColor: "#a8c8e8", elevation: 0 },
  verifyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  resendButton: { marginTop: 14, paddingVertical: 10, alignItems: "center" },
  resendText: { fontSize: 13, color: "#3498db", fontWeight: "600" },

  // ── Bottom spacer ─────────────────────────────────────────────────────────
  // Gives breathing room above the keyboard when it appears
  bottomSpacer: { height: 40 },
});