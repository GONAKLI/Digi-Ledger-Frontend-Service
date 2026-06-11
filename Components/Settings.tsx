import { useState, useEffect } from "react";
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
  StatusBar,
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

function EditNameModal({ visible, currentName, onSave, onClose, loading }) {
  const [name, setName] = useState(currentName);
  useEffect(() => { setName(currentName); }, [currentName]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={ModalStyles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
          <View style={ModalStyles.card}>
            <Text style={ModalStyles.title}>Change Name</Text>
            <TextInput
              style={ModalStyles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#94A3B8"
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
                {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={ModalStyles.saveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function FeedbackModal({ visible, onSend, onClose, loading }) {
  const [feedbackText, setFeedbackText] = useState("");

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={ModalStyles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
          <View style={ModalStyles.card}>
            <Text style={ModalStyles.title}>Send Feedback</Text>
            <Text style={ModalStyles.subtitle}>We'd love to hear what you think!</Text>
            <TextInput
              style={[ModalStyles.input, { minHeight: 110, textAlignVertical: "top" }]}
              value={feedbackText}
              onChangeText={setFeedbackText}
              placeholder="Tell us what you think…"
              placeholderTextColor="#94A3B8"
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
                {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={ModalStyles.saveText}>Send</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function PinModal({ visible, hasPin, onSave, onRemove, onClose, loading }) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState("enter");
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
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
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
              placeholderTextColor="#94A3B8"
              autoFocus
            />

            {error ? <Text style={ModalStyles.errorText}>{error}</Text> : null}

            <View style={ModalStyles.row}>
              <TouchableOpacity style={ModalStyles.cancelBtn} onPress={() => { reset(); onClose(); }}>
                <Text style={ModalStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ModalStyles.saveBtn, loading && ModalStyles.btnDisabled]}
                onPress={step === "enter" ? handleNext : handleConfirm}
                disabled={loading}
              >
                <Text style={ModalStyles.saveText}>{step === "enter" ? "Next" : "Set PIN"}</Text>
              </TouchableOpacity>
            </View>

            {hasPin && step === "enter" && (
              <TouchableOpacity style={ModalStyles.removeBtn} onPress={() => { reset(); onRemove(); }}>
                <Text style={ModalStyles.removeText}>Remove PIN lock</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function Settings({ navigation }) {
  const dispatch = useDispatch();
  const { token, userName, profilePic, hasPin, settingsLoading } = useSelector(
    (s) => s.authOperations
  );

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

  async function handleSaveName(name) {
    if (!name || name.length < 2) return;
    try {
      const authToken = await getToken();
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
          "Set Profile",
          "Are You ready to Set Your Profile Picture ",
          [
            { text: "I am Ready ", onPress: async () => {
              try {
                const authToken = await getToken();
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
      const authToken = await getToken();
      const result = await dispatch(submitFeedbackThunk({ authToken, feedback: text }));
      if (submitFeedbackThunk.fulfilled.match(result)) {
        setShowFeedbackModal(false);
        Alert.alert("🙏", "Thanks For Submitting Your Valuable Feedback");
      } else {
        Alert.alert("Error", result.payload || "Failed to submit feedback");
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  }

  async function handleSetPin(pin) {
    try {
      const authToken = await getToken();
      const result = await dispatch(setPinThunk({ authToken, pin }));
      if (setPinThunk.fulfilled.match(result)) {
        setShowPinModal(false);
        Alert.alert("🔒", "Your Data is now Fully Secured");
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
            const authToken = await getToken();
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
            const authToken = await getToken();
            await dispatch(logoutThunk(authToken));
          } catch (_) {}
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
      "Are You Serious, No Return Ticket Allowed After This Step",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            try {
              const authToken = await getToken();
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

  const SettingRow = ({ icon, label, value = "", onPress, destructive = false, rightElement = null }) => (
    <TouchableOpacity style={Styles.row} onPress={onPress} activeOpacity={0.6}>
      <View style={[Styles.rowIcon, destructive && Styles.rowIconDestructive]}>
        <Text style={[Styles.rowIconText, destructive && { color: "#EF4444" }]}>{icon}</Text>
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={Styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={Styles.backBtn}>
          <Text style={Styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={Styles.headerTitle}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={Styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={Styles.profileCard}>
          <TouchableOpacity onPress={handlePickPhoto} style={Styles.avatarContainer} activeOpacity={0.85}>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={Styles.avatarImage} />
            ) : (
              <View style={Styles.avatarPlaceholder}>
                <Text style={Styles.avatarPlaceholderText}>{userName ? userName[0].toUpperCase() : "?"}</Text>
              </View>
            )}
            <View style={Styles.cameraOverlay}>
              <Text style={Styles.cameraIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          <View style={Styles.profileInfo}>
            <Text style={Styles.profileName}>{userName || "Set your name"}</Text>
            <Text style={Styles.profileTap}>Tap profile picture to update</Text>
          </View>
        </View>

        <Text style={Styles.sectionLabel}>ACCOUNT PROFILE</Text>
        <View style={Styles.section}>
          <SettingRow icon="✏️" label="Change Name" value={userName || "Not set"} onPress={() => setShowNameModal(true)} />
          <View style={Styles.separator} />
          <SettingRow icon="🖼️" label="Change Profile Photo" onPress={handlePickPhoto} />
        </View>

        <Text style={Styles.sectionLabel}>SECURITY PRIVACY</Text>
        <View style={Styles.section}>
          <SettingRow
            icon="🔒"
            label="App Lock PIN"
            value={hasPin ? "Secured" : "Unprotected"}
            onPress={() => setShowPinModal(true)}
            rightElement={
              <View style={[Styles.pinBadge, hasPin ? Styles.pinBadgeOn : Styles.pinBadgeOff]}>
                <Text style={[Styles.pinBadgeText, hasPin ? Styles.pinBadgeTextOn : Styles.pinBadgeTextOff]}>{hasPin ? "ON" : "OFF"}</Text>
              </View>
            }
          />
        </View>

        <Text style={Styles.sectionLabel}>SUPPORT & HELP</Text>
        <View style={Styles.section}>
          <SettingRow icon="💬" label="Send Feedback" onPress={() => setShowFeedbackModal(true)} />
        </View>

        <Text style={Styles.sectionLabel}>APP ACCOUNT SESSION</Text>
        <View style={Styles.section}>
          <SettingRow icon="🚪" label="Logout Account" onPress={handleLogout} />
        </View>

        <Text style={Styles.sectionLabel}>DANGER ZONE</Text>
        <View style={[Styles.section, Styles.dangerSection]}>
          <SettingRow icon="🗑️" label="Delete Ledger Account" value="Permanently wipe all financial transactions" onPress={handleDeleteAccount} destructive />
        </View>

        <Text style={Styles.appVersion}>Digi Ledger • Version 1.0.0</Text>
      </ScrollView>

      <EditNameModal visible={showNameModal} currentName={userName} onSave={handleSaveName} onClose={() => setShowNameModal(false)} loading={settingsLoading} />
      <FeedbackModal visible={showFeedbackModal} onSend={handleSendFeedback} onClose={() => setShowFeedbackModal(false)} loading={settingsLoading} />
      <PinModal visible={showPinModal} hasPin={hasPin} onSave={handleSetPin} onRemove={handleRemovePin} onClose={() => setShowPinModal(false)} loading={settingsLoading} />
    </SafeAreaView>
  );
}

const Styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  backBtn: { paddingVertical: 4 },
  backBtnText: { color: "#64748B", fontSize: 15, fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 48, paddingTop: 16 },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  avatarContainer: { position: "relative" },
  avatarImage: { width: 68, height: 68, borderRadius: 20, backgroundColor: "#F1F5F9" },
  avatarPlaceholder: { width: 68, height: 68, borderRadius: 20, backgroundColor: "#4F46E5", justifyContent: "center", alignItems: "center" },
  avatarPlaceholderText: { fontSize: 26, fontWeight: "700", color: "#FFFFFF" },
  cameraOverlay: { position: "absolute", bottom: -4, right: -4, backgroundColor: "#0F172A", borderRadius: 8, width: 24, height: 24, justifyContent: "center", alignItems: "center", borderWidth: 1.5, borderColor: "#FFFFFF" },
  cameraIcon: { fontSize: 11, color: "#FFFFFF" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: "700", color: "#0F172A", marginBottom: 2 },
  profileTap: { fontSize: 12, color: "#64748B", fontWeight: "400" },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#94A3B8", letterSpacing: 1.0, marginBottom: 8, marginLeft: 6, marginTop: 8 },
  section: { backgroundColor: "#FFFFFF", borderRadius: 20, marginBottom: 16, overflow: "hidden", borderWidth: 1, borderColor: "#E2E8F0" },
  dangerSection: { borderColor: "#FCA5A5" },
  separator: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 60 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center", marginRight: 14 },
  rowIconDestructive: { backgroundColor: "#FEF2F2" },
  rowIconText: { fontSize: 16, color: "#475569" },
  rowContent: { flex: 1, paddingRight: 8 },
  rowLabel: { fontSize: 15, fontWeight: "600", color: "#1E293B" },
  rowLabelDestructive: { color: "#EF4444", fontWeight: "600" },
  rowValue: { fontSize: 12, color: "#64748B", marginTop: 3 },
  rowChevron: { fontSize: 18, color: "#94A3B8", fontWeight: "400" },
  pinBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pinBadgeOn: { backgroundColor: "#DCFCE7" },
  pinBadgeOff: { backgroundColor: "#F1F5F9" },
  pinBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  pinBadgeTextOn: { color: "#15803D" },
  pinBadgeTextOff: { color: "#64748B" },
  appVersion: { fontSize: 12, color: "#94A3B8", textAlign: "center", marginTop: 16, marginBottom: 16, fontWeight: "500" },
});

const ModalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.3)", justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 24, width: "100%", elevation: 6 },
  title: { fontSize: 18, fontWeight: "700", color: "#0F172A", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#64748B", marginBottom: 16, lineHeight: 18 },
  input: { backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: "#0F172A", marginBottom: 8, fontWeight: "500" },
  pinInput: { textAlign: "center", fontSize: 22, letterSpacing: 16, fontWeight: "700", color: "#4F46E5", paddingLeft: 16 },
  charCount: { fontSize: 11, color: "#94A3B8", textAlign: "right", marginBottom: 12 },
  errorText: { color: "#EF4444", fontSize: 13, fontWeight: "600", marginBottom: 8, marginLeft: 2 },
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  cancelBtn: { flex: 1, backgroundColor: "#F1F5F9", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: "#64748B" },
  saveBtn: { flex: 1, backgroundColor: "#4F46E5", borderRadius: 14, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  saveText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  btnDisabled: { opacity: 0.4 },
  removeBtn: { marginTop: 16, alignItems: "center", paddingVertical: 4 },
  removeText: { fontSize: 13, color: "#EF4444", fontWeight: "600" },
});