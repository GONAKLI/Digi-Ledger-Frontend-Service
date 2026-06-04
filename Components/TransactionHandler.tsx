import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from "react-native";
import { useDispatch } from "react-redux";
import { addTransactionThunk } from "../Redux/Slice";

export default function TransactionHandler(props) {
  const { showModal, setShowModal, transactionType, customer, onTransactionAdded } = props;
  const dispatch = useDispatch();

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const isGiven = transactionType === "given";

  async function handleConfirm() {
    if (!amount.trim()) {
      Alert.alert("Missing Amount", "Please enter an amount.");
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Invalid Amount", "Please enter a positive number.");
      return;
    }

    setLoading(true);
    const phone = await AsyncStorage.getItem("phone");
    const userToken = await AsyncStorage.getItem("token");

    const result = await dispatch(
      addTransactionThunk({
        customerId: customer._id,
        amount: amountNum,
        note: note.trim() || "No note",
        transactionType,
        phone,
        userToken,
      })
    );
    setLoading(false);

    if (addTransactionThunk.fulfilled.match(result)) {
      // Optimistic update callback for ViewCustomerData local state
      if (onTransactionAdded) {
        onTransactionAdded(result.payload.transaction);
      }
      setAmount("");
      setNote("");
      setShowModal(false);
    } else {
      Alert.alert("Error", result.payload || "Failed to add transaction");
    }
  }

  const handleClose = () => {
    Keyboard.dismiss();
    setShowModal(false);
    setAmount("");
    setNote("");
  };

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      {/* KeyboardAvoidingView inside Modal */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={Styles.modalContainer}
      >
        <TouchableOpacity style={Styles.backdrop} onPress={handleClose} activeOpacity={1} />

        <View style={Styles.sheet}>
          {/* Drag handle */}
          <View style={Styles.dragHandle} />

          {/* Header */}
          <View style={Styles.header}>
            <Text style={[Styles.title, isGiven ? Styles.titleGiven : Styles.titleReceived]}>
              {isGiven ? "📤 Money Given" : "📥 Money Received"}
            </Text>
            <TouchableOpacity onPress={handleClose} style={Styles.closeBtn}>
              <Text style={Styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Customer pill */}
          <View style={Styles.customerPill}>
            <View style={Styles.customerAvatar}>
              <Text style={Styles.customerAvatarText}>
                {customer?.name?.[0]?.toUpperCase()}
              </Text>
            </View>
            <Text style={Styles.customerName}>{customer?.name}</Text>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Amount */}
            <View style={Styles.section}>
              <Text style={Styles.label}>AMOUNT (₹)</Text>
              <View style={[Styles.amountWrapper, isGiven ? Styles.amountBorderGiven : Styles.amountBorderReceived]}>
                <Text style={[Styles.currencySymbol, isGiven ? Styles.givenColor : Styles.receivedColor]}>
                  ₹
                </Text>
                <TextInput
                  style={Styles.amountInput}
                  keyboardType="decimal-pad"
                  value={amount}
                  maxLength={7}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor="#ccc"
                  autoFocus
                />
              </View>
            </View>

            {/* Note */}
            <View style={Styles.section}>
              <Text style={Styles.label}>NOTE (OPTIONAL)</Text>
              <View style={Styles.noteWrapper}>
                <TextInput
                  style={Styles.noteInput}
                  value={note}
                  onChangeText={setNote}
                  placeholder="Add a description…"
                  placeholderTextColor="#ccc"
                  multiline
                  maxLength={100}
                  returnKeyType="done"
                  blurOnSubmit
                />
                <Text style={Styles.charCount}>{note.length}/200</Text>
              </View>
            </View>

            {/* Summary */}
            {amount ? (
              <View style={[Styles.summaryBox, isGiven ? Styles.summaryGiven : Styles.summaryReceived]}>
                <Text style={Styles.summaryLabel}>
                  {isGiven ? "You are giving" : "You are receiving"}
                </Text>
                <Text style={[Styles.summaryAmount, isGiven ? Styles.givenColor : Styles.receivedColor]}>
                  ₹{parseFloat(amount || 0).toLocaleString()}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Footer buttons */}
          <View style={Styles.footer}>
            <TouchableOpacity
              style={Styles.cancelBtn}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={Styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                Styles.confirmBtn,
                isGiven ? Styles.confirmBtnGiven : Styles.confirmBtnReceived,
                (loading || !amount) && Styles.btnDisabled,
              ]}
              onPress={handleConfirm}
              disabled={loading || !amount}
            >
              <Text style={Styles.confirmText}>
                {loading ? "Saving…" : "Confirm ✓"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const Styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    maxHeight: "88%",
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d0d7df",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f4f8",
  },
  title: { fontSize: 17, fontWeight: "800" },
  titleGiven: { color: "#c0392b" },
  titleReceived: { color: "#1e8449" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#f0f4f8",
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: { fontSize: 14, color: "#7f8c8d", fontWeight: "700" },
  customerPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f4f8",
  },
  customerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#3498db",
    justifyContent: "center",
    alignItems: "center",
  },
  customerAvatarText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  customerName: { fontSize: 15, fontWeight: "700", color: "#1a2533" },
  section: { paddingHorizontal: 20, paddingTop: 16 },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#7f8c8d",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  amountWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 16,
  },
  amountBorderGiven: { borderColor: "#e74c3c" },
  amountBorderReceived: { borderColor: "#27ae60" },
  currencySymbol: { fontSize: 26, fontWeight: "800", marginRight: 6 },
  givenColor: { color: "#c0392b" },
  receivedColor: { color: "#1e8449" },
  amountInput: {
    flex: 1,
    fontSize: 30,
    fontWeight: "700",
    color: "#1a2533",
    paddingVertical: 12,
  },
  noteWrapper: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e0e6ed",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    minHeight: 90,
  },
  noteInput: { fontSize: 14, color: "#1a2533", textAlignVertical: "top" },
  charCount: { fontSize: 10, color: "#bdc3c7", textAlign: "right", marginTop: 4 },
  summaryBox: {
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  summaryGiven: { backgroundColor: "#fdecea" },
  summaryReceived: { backgroundColor: "#eafaf1" },
  summaryLabel: { fontSize: 11, color: "#888", fontWeight: "600", letterSpacing: 0.4 },
  summaryAmount: { fontSize: 26, fontWeight: "800", marginTop: 4 },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f4f8",
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#f0f4f8",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: { fontSize: 15, fontWeight: "700", color: "#7f8c8d" },
  confirmBtn: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  confirmBtnGiven: { backgroundColor: "#e74c3c" },
  confirmBtnReceived: { backgroundColor: "#27ae60" },
  confirmText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  btnDisabled: { opacity: 0.5 },
});