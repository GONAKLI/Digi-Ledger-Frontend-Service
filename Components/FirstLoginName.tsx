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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDispatch, useSelector } from "react-redux";
import { updateNameThunk } from "../Redux/Slice";

export default function FirstLoginName({ navigation }) {
  const dispatch = useDispatch();
  const { token, settingsLoading } = useSelector((s) => s.authOperations);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function handleContinue() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    setError("");

    const result = await dispatch(
      updateNameThunk({ authToken: token, name: trimmed })
    );

    if (updateNameThunk.fulfilled.match(result)) {
      navigation.replace("Home");
    } else {
      setError(result.payload || "Something went wrong");
    }
  }

  function handleSkip() {
    navigation.replace("Home");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={Styles.container}
    >
      <ScrollView
        contentContainerStyle={Styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration area */}
        <View style={Styles.illustrationArea}>
          <View style={Styles.bigEmoji}>
            <Text style={Styles.emojiText}>👋</Text>
          </View>
          <Text style={Styles.welcomeTitle}>Welcome aboard!</Text>
          <Text style={Styles.welcomeSubtitle}>
            Let's set up your account.{"\n"}What should we call you?
          </Text>
        </View>

        {/* Card */}
        <View style={Styles.card}>
          <Text style={Styles.label}>YOUR NAME</Text>
          <View style={[Styles.inputRow, error ? Styles.inputRowError : null]}>
            <Text style={Styles.inputIcon}>✏️</Text>
            <TextInput
              style={Styles.input}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor="#b0b8c1"
              value={name}
              onChangeText={(t) => { setName(t); setError(""); }}
              autoFocus
              maxLength={20}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>

          {error ? <Text style={Styles.errorText}>⚠️ {error}</Text> : null}

          <TouchableOpacity
            style={[Styles.continueBtn, settingsLoading && Styles.btnDisabled]}
            onPress={handleContinue}
            disabled={settingsLoading}
            activeOpacity={0.85}
          >
            <Text style={Styles.continueBtnText}>
              {settingsLoading ? "Saving…" : "Continue →"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} style={Styles.skipBtn}>
            <Text style={Styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const Styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4f8" },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  illustrationArea: { alignItems: "center", marginBottom: 36 },
  bigEmoji: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#3498db",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  emojiText: { fontSize: 44 },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1a2533",
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: "#7f8c8d",
    textAlign: "center",
    lineHeight: 22,
  },
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
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7f8c8d",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e0e6ed",
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  inputRowError: { borderColor: "#e74c3c" },
  inputIcon: { fontSize: 18, marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#1a2533",
    paddingVertical: 14,
  },
  errorText: { fontSize: 13, color: "#e74c3c", fontWeight: "500", marginBottom: 8 },
  continueBtn: {
    backgroundColor: "#3498db",
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 12,
    elevation: 3,
    shadowColor: "#3498db",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  btnDisabled: { backgroundColor: "#a8c8e8", elevation: 0 },
  continueBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  skipBtn: { paddingVertical: 14, alignItems: "center" },
  skipText: { fontSize: 14, color: "#aab", fontWeight: "500" },
});