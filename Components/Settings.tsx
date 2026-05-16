import { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { launchImageLibrary } from "react-native-image-picker";
import { useDispatch, useSelector } from "react-redux";
import {
  updateNameThunk,
  updateProfilePicThunk,
  submitFeedbackThunk,
  logoutThunk,
  deleteAccountThunk,
  setPinThunk,
  fetchProfile,
  logout,
} from "../Redux/Slice";


// ── Sub-modal: Edit Name ──────────────────────────────────────────────────────
function EditNameModal({ visible, currentName, onSave, onClose, loading }) {
  const [name, setName] = useState(currentName);
  useEffect(() => { setName(currentName); }, [currentName]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={ModalStyles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={ModalStyles.card}>
            <Text style={ModalStyles.title}>Change Name</Text>
            <TextInput
              style={ModalStyles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#aab"
              maxLength={50}
              autoFocus
            />
            <View style={ModalStyles.row}>
              <TouchableOpacity style={ModalStyles.cancelBtn} onPress={onClose}>
                <Text style={ModalStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ModalStyles.saveBtn, loading && ModalStyles.btnDisabled]}
                onPress={() => onSave(name.trim())}
                disabled={loading}
              >
                <Text style={ModalStyles.saveText}>{loading ? "Saving…" : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Sub-modal: Feedback ───────────────────────────────────────────────────────
function FeedbackModal({ visible, onSend, onClose, loading }) {
  const [feedbackText, setFeedbackText] = useState("");  // FIXED: renamed from 'text' to avoid shadowing

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={ModalStyles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={ModalStyles.card}>
            <Text style={ModalStyles.title}>Send Feedback</Text>
            <Text style={ModalStyles.subtitle}>
              We'd love to hear what you think!
            </Text>
            <TextInput
              style={[ModalStyles.input, { minHeight: 100, textAlignVertical: "top" }]}
              value={feedbackText}
              onChangeText={setFeedbackText}  // FIXED: was shadowing 'text' variable
              placeholder="Tell us what you think…"
              placeholderTextColor="#aab"
              maxLength={500}
              multiline
              autoFocus
            />
            <Text style={ModalStyles.charCount}>{feedbackText.length}/500</Text>
            <View style={ModalStyles.row}>
              <TouchableOpacity style={ModalStyles.cancelBtn} onPress={() => { setFeedbackText(""); onClose(); }}>
                <Text style={ModalStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ModalStyles.saveBtn, (loading || feedbackText.trim().length < 5) && ModalStyles.btnDisabled]}
                onPress={() => onSend(feedbackText.trim())}
                disabled={loading || feedbackText.trim().length < 5}
              >
                <Text style={ModalStyles.saveText}>{loading ? "Sending…" : "Send"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Sub-modal: Set / Change PIN ───────────────────────────────────────────────
function PinModal({ visible, hasPin, onSave, onRemove, onClose, loading }) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState("enter");  // FIXED: removed TypeScript type annotation
  const [error, setError] = useState("");

  function reset() {
    setPin(""); setConfirmPin(""); setStep("enter"); setError("");
  }

  function handleNext() {
    if (!/^\d{4,6}$/.test(pin)) {
      setError("PIN must be 4 digits");
      return;
    }
    setError("");
    setStep("confirm");
  }

  function handleConfirm() {
    if (pin !== confirmPin) {
      setError("PINs don't match. Try again.");
      setConfirmPin("");
      return;
    }
    onSave(pin);
    reset();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { reset(); onClose(); }}>
      <View style={ModalStyles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={ModalStyles.card}>
            <Text style={ModalStyles.title}>
              {step === "enter" ? (hasPin ? "Change PIN" : "Set PIN") : "Confirm PIN"}
            </Text>
            <Text style={ModalStyles.subtitle}>
              {step === "enter" ? "Enter a 4 digit PIN" : "Enter the same PIN again"}
            </Text>

            <TextInput
              style={[ModalStyles.input, ModalStyles.pinInput]}
              value={step === "enter" ? pin : confirmPin}
              onChangeText={step === "enter" ? setPin : setConfirmPin}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              placeholder="• • • •"
              placeholderTextColor="#aab"
              autoFocus
            />

            {error ? <Text style={ModalStyles.errorText}>{error}</Text> : null}

            <View style={ModalStyles.row}>
              <TouchableOpacity
                style={ModalStyles.cancelBtn}
                onPress={() => { reset(); onClose(); }}
              >
                <Text style={ModalStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ModalStyles.saveBtn, loading && ModalStyles.btnDisabled]}
                onPress={step === "enter" ? handleNext : handleConfirm}
                disabled={loading}
              >
                <Text style={ModalStyles.saveText}>
                  {loading ? "Saving…" : step === "enter" ? "Next →" : "Set PIN"}
                </Text>
              </TouchableOpacity>
            </View>

            {hasPin && step === "enter" && (
              <TouchableOpacity
                style={ModalStyles.removeBtn}
                onPress={() => { reset(); onRemove(); }}
              >
                <Text style={ModalStyles.removeText}>Remove PIN lock</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Settings Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function Settings({ navigation }) {
  
  const dispatch = useDispatch();
  const { token, userName, profilePic, hasPin, settingsLoading } = useSelector(
    (s) => s.authOperations
  );

  // FIXED: always read token fresh from AsyncStorage to avoid null/stale Redux state
  const getToken = async () => {
    const stored = await AsyncStorage.getItem("token");
    const t = token || stored;
    if (!t) throw new Error("Auth token not found. Please log in again.");
    return t;
  };

  const [showNameModal, setShowNameModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem("token");
      if (t) dispatch(fetchProfile(t));
    })();
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleSaveName(name) {
    if (!name || name.length < 2) return;
    try {
      const authToken = await getToken();  // FIXED: fresh token
      const result = await dispatch(updateNameThunk({ authToken, name }));
      if (updateNameThunk.fulfilled.match(result)) {
        setShowNameModal(false);
        Alert.alert("✅", "Name updated successfully");
      } else {
        Alert.alert("Error", result.payload || "Failed to update name");
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  }

  async function handlePickPhoto() {
    launchImageLibrary(
      { mediaType: "photo", quality: 0.7 },
      async (response) => {
        if (response.didCancel || response.errorCode) return;
        const asset = response.assets?.[0];
        if (!asset?.uri) return;

        Alert.alert(
          "Upload Photo",
          "To save your profile picture, upload the selected image to your file server and paste the URL.",
          [
            { text: "Use local path (dev only)", onPress: async () => {
              try {
                const authToken = await getToken();  // FIXED: fresh token
                const result = await dispatch(
                  updateProfilePicThunk({ authToken, profilePicPath: asset.uri })
                );
                if (updateProfilePicThunk.rejected.match(result)) {
                  Alert.alert("Error", result.payload || "Failed to update photo");
                }
              } catch (e) {
                Alert.alert("Error", e.message);
              }
            }},
            { text: "Cancel", style: "cancel" },
          ]
        );
      }
    );
  }

  async function handleSendFeedback(text) {
    try {
      const authToken = await getToken();  // FIXED: fresh token
      const result = await dispatch(submitFeedbackThunk({ authToken, feedback: text }));
      if (submitFeedbackThunk.fulfilled.match(result)) {
        setShowFeedbackModal(false);
        Alert.alert("🙏 Thank you!", "Your feedback has been submitted.");
      } else {
        Alert.alert("Error", result.payload || "Failed to submit feedback");
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  }

  async function handleSetPin(pin) {
    try {
      const authToken = await getToken();  // FIXED: fresh token
      const result = await dispatch(setPinThunk({ authToken, pin }));
      if (setPinThunk.fulfilled.match(result)) {
        setShowPinModal(false);
        Alert.alert("🔒", "App lock PIN set successfully");
      } else {
        Alert.alert("Error", result.payload || "Failed to set PIN");
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  }

  async function handleRemovePin() {
    Alert.alert("Remove PIN", "Are you sure you want to disable app lock?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            const authToken = await getToken();  // FIXED: fresh token
            const result = await dispatch(setPinThunk({ authToken, pin: "" }));
            if (setPinThunk.fulfilled.match(result)) {
              Alert.alert("✅", "App lock disabled");
            }
          } catch (e) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  }

  async function handleLogout() {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            const authToken = await getToken();  // FIXED: fresh token
            await dispatch(logoutThunk(authToken));
          } catch (_) {
            // token already gone — proceed with local logout anyway
          }
          await AsyncStorage.multiRemove(["token", "phone"]);
          dispatch(logout());
          navigation.replace("Login");
        },
      },
    ]);
  }

  async function handleDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and ALL data including customers and transactions. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            try {
              const authToken = await getToken();  // FIXED: fresh token
              const phone = await AsyncStorage.getItem("phone");
              const result = await dispatch(deleteAccountThunk({ authToken, phone }));
              if (deleteAccountThunk.fulfilled.match(result)) {
                await AsyncStorage.multiRemove(["token", "phone"]);
                navigation.replace("Login");
              } else {
                Alert.alert("Error", result.payload || "Failed to delete account");
              }
            } catch (e) {
              Alert.alert("Error", e.message);
            }
          },
        },
      ]
    );
  }

  // ── Render section rows ───────────────────────────────────────────────────
  const SettingRow = ({ icon, label, value = "", onPress, destructive = false, rightElement = null }) => (
    <TouchableOpacity
      style={Styles.row}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[Styles.rowIcon, destructive && Styles.rowIconDestructive]}>
        <Text style={Styles.rowIconText}>{icon}</Text>
      </View>
      <View style={Styles.rowContent}>
        <Text style={[Styles.rowLabel, destructive && Styles.rowLabelDestructive]}>{label}</Text>
        {value ? <Text style={Styles.rowValue} numberOfLines={1}>{value}</Text> : null}
      </View>
      {rightElement || <Text style={Styles.rowChevron}>›</Text>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={Styles.container}>
      {/* Header */}
      <View style={Styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={Styles.backBtn}>
          <Text style={Styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={Styles.headerTitle}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={Styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile card */}
        <View style={Styles.profileCard}>
          <TouchableOpacity onPress={handlePickPhoto} style={Styles.avatarContainer} activeOpacity={0.8}>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={Styles.avatarImage} />
            ) : (
              <View style={Styles.avatarPlaceholder}>
                <Text style={Styles.avatarPlaceholderText}>
                  {userName ? userName[0].toUpperCase() : "?"}
                </Text>
              </View>
            )}
            <View style={Styles.cameraOverlay}>
              <Text style={Styles.cameraIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          <View style={Styles.profileInfo}>
            <Text style={Styles.profileName}>{userName || "Set your name"}</Text>
            <Text style={Styles.profileTap}>Tap photo to change</Text>
          </View>
        </View>

        {/* Section: Account */}
        <Text style={Styles.sectionLabel}>ACCOUNT</Text>
        <View style={Styles.section}>
          <SettingRow
            icon="✏️"
            label="Change Name"
            value={userName || "Not set"}
            onPress={() => setShowNameModal(true)}
          />
          <View style={Styles.separator} />
          <SettingRow
            icon="🖼️"
            label="Change Profile Photo"
            onPress={handlePickPhoto}
          />
        </View>

        {/* Section: Security */}
        <Text style={Styles.sectionLabel}>SECURITY</Text>
        <View style={Styles.section}>
          <SettingRow
            icon="🔒"
            label="App Lock PIN"
            value={hasPin ? "Enabled" : "Disabled"}
            onPress={() => setShowPinModal(true)}
            rightElement={
              <View style={[Styles.pinBadge, hasPin ? Styles.pinBadgeOn : Styles.pinBadgeOff]}>
                <Text style={[Styles.pinBadgeText, hasPin ? Styles.pinBadgeTextOn : Styles.pinBadgeTextOff]}>
                  {hasPin ? "ON" : "OFF"}
                </Text>
              </View>
            }
          />
        </View>

        {/* Section: Support */}
        <Text style={Styles.sectionLabel}>SUPPORT</Text>
        <View style={Styles.section}>
          <SettingRow
            icon="💬"
            label="Send Feedback"
            onPress={() => setShowFeedbackModal(true)}
          />
        </View>

        {/* Section: Danger zone */}
        <Text style={Styles.sectionLabel}>SESSION</Text>
        <View style={Styles.section}>
          <SettingRow
            icon="🚪"
            label="Logout"
            onPress={handleLogout}
          />
        </View>

        <Text style={Styles.sectionLabel}>DANGER ZONE</Text>
        <View style={[Styles.section, Styles.dangerSection]}>
          <SettingRow
            icon="🗑️"
            label="Delete Account"
            value="Permanently removes all your data"
            onPress={handleDeleteAccount}
            destructive
          />
        </View>

        <Text style={Styles.appVersion}>Digi Ledger v1.0.0</Text>
      </ScrollView>

      {/* Modals */}
      <EditNameModal
        visible={showNameModal}
        currentName={userName}
        onSave={handleSaveName}
        onClose={() => setShowNameModal(false)}
        loading={settingsLoading}
      />
      <FeedbackModal
        visible={showFeedbackModal}
        onSend={handleSendFeedback}
        onClose={() => setShowFeedbackModal(false)}
        loading={settingsLoading}
      />
      <PinModal
        visible={showPinModal}
        hasPin={hasPin}
        onSave={handleSetPin}
        onRemove={handleRemovePin}
        onClose={() => setShowPinModal(false)}
        loading={settingsLoading}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const Styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4f8" },
  header: {
    backgroundColor: "#3498db",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: { paddingVertical: 4 },
  backBtnText: { color: "#d6eaf8", fontSize: 14, fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 48, paddingTop: 20 },
  // Profile card
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  avatarContainer: { position: "relative" },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: "#e0e6ed",
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#3498db",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#e0e6ed",
  },
  avatarPlaceholderText: { fontSize: 28, fontWeight: "800", color: "#fff" },
  cameraOverlay: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#fff",
    borderRadius: 10,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e0e6ed",
  },
  cameraIcon: { fontSize: 12 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: "800", color: "#1a2533", marginBottom: 4 },
  profileTap: { fontSize: 12, color: "#aab" },
  // Section
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7f8c8d",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 8,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  dangerSection: {
    borderWidth: 1.5,
    borderColor: "#fbb",
  },
  separator: {
    height: 1,
    backgroundColor: "#f0f4f8",
    marginLeft: 54,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f0f4f8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rowIconDestructive: { backgroundColor: "#fdecea" },
  rowIconText: { fontSize: 18 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "700", color: "#1a2533" },
  rowLabelDestructive: { color: "#c0392b" },
  rowValue: { fontSize: 12, color: "#7f8c8d", marginTop: 2 },
  rowChevron: { fontSize: 20, color: "#c8d0d8", fontWeight: "600" },
  pinBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pinBadgeOn: { backgroundColor: "#e8f8f0" },
  pinBadgeOff: { backgroundColor: "#f0f4f8" },
  pinBadgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  pinBadgeTextOn: { color: "#27ae60" },
  pinBadgeTextOff: { color: "#aab" },
  appVersion: {
    fontSize: 12,
    color: "#c8d0d8",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 16,
  },
});

// ─── Modal shared styles ──────────────────────────────────────────────────────
const ModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  title: { fontSize: 18, fontWeight: "800", color: "#1a2533", marginBottom: 6 },
  subtitle: { fontSize: 13, color: "#7f8c8d", marginBottom: 14 },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e0e6ed",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1a2533",
    marginBottom: 8,
  },
  pinInput: {
    textAlign: "center",
    fontSize: 24,
    letterSpacing: 12,
    fontWeight: "700",
  },
  charCount: { fontSize: 11, color: "#aab", textAlign: "right", marginBottom: 12 },
  errorText: { color: "#e74c3c", fontSize: 13, fontWeight: "500", marginBottom: 8 },
  row: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#f0f4f8",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelText: { fontSize: 15, fontWeight: "700", color: "#7f8c8d" },
  saveBtn: {
    flex: 1,
    backgroundColor: "#3498db",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#3498db",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  saveText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  btnDisabled: { opacity: 0.5 },
  removeBtn: { marginTop: 12, alignItems: "center", paddingVertical: 8 },
  removeText: { fontSize: 13, color: "#e74c3c", fontWeight: "600" },
});