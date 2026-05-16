import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { requestLoginOtp } from "../Redux/Slice";

function Login({ navigation }) {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.authOperations);
  const [val, setVal] = useState("");
  const [localError, setLocalError] = useState(false);

  async function handleSubmit() {
    if (val.length !== 10) {
      setLocalError(true);
      return;
    }
    setLocalError(false);
    const result = await dispatch(requestLoginOtp(val));
    if (requestLoginOtp.fulfilled.match(result)) {
      navigation.replace("Otp");
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={Styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={Styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={Styles.topSection}>
          <View style={Styles.logoCircle}>
            <Text style={Styles.logoIcon}>📒</Text>
          </View>
          <Text style={Styles.appTitle}>Digi Ledger</Text>
          <Text style={Styles.subtitle}>Manage your transactions effortlessly</Text>
        </View>

        <View style={Styles.formSection}>
          <Text style={Styles.label}>Mobile Number</Text>

          <View style={[Styles.phoneInputWrapper, (localError || error) && Styles.inputError]}>
            <View style={Styles.countryCodeBox}>
              <Text style={Styles.countryCode}>🇮🇳 +91</Text>
            </View>
            <TextInput
              style={Styles.phoneInput}
              onChangeText={(text) => {
                setVal(text);
                setLocalError(false);
              }}
              value={val}
              placeholder="10-digit number"
              placeholderTextColor="#aaa"
              keyboardType="phone-pad"
              maxLength={10}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          {(localError || error) && (
            <Text style={Styles.errorText}>
              ⚠️ {error || "Enter a valid 10-digit number"}
            </Text>
          )}

          <TouchableOpacity
            onPress={handleSubmit}
            style={[Styles.proceedButton, loading && Styles.proceedButtonDisabled]}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={Styles.proceedText}>
              {loading ? "Sending OTP…" : "Get OTP →"}
            </Text>
          </TouchableOpacity>

         
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const Styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f8",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  topSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#3498db",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  logoIcon: {
    fontSize: 38,
  },
  appTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1a2533",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#7f8c8d",
    fontWeight: "500",
  },
  formSection: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a2533",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  phoneInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e0e6ed",
    overflow: "hidden",
    marginBottom: 8,
    backgroundColor: "#f8fafc",
  },
  inputError: {
    borderColor: "#e74c3c",
  },
  countryCodeBox: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: "#e0e6ed",
    backgroundColor: "#f0f4f8",
  },
  countryCode: {
    color: "#1a2533",
    fontSize: 15,
    fontWeight: "600",
  },
  phoneInput: {
    flex: 1,
    color: "#1a2533",
    fontSize: 17,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  proceedButton: {
    backgroundColor: "#3498db",
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 16,
    elevation: 3,
    shadowColor: "#3498db",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  proceedButtonDisabled: {
    backgroundColor: "#a8c8e8",
    elevation: 0,
  },
  proceedText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  errorText: {
    color: "#e74c3c",
    fontSize: 13,
    marginBottom: 4,
    fontWeight: "500",
  },
  termsText: {
    fontSize: 11,
    color: "#aab",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 16,
  },
});

export default Login;