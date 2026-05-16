import { Text } from "@react-navigation/elements";
import { useEffect, useState } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDispatch, useSelector } from "react-redux";
import { addCustomerThunk } from "../Redux/Slice";

export default function AddCustomer({ navigation }) {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.authOperations);

  const [name, setName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem("token");
      if (!token) navigation.replace("Login");
    })();
  }, []);

  async function handleAddCustomer() {
    if (!name.trim() || !customerPhone.trim() || !address.trim()) {
      Alert.alert("Incomplete", "Please fill all fields before continuing.");
      return;
    }
    if (customerPhone.length !== 10) {
      Alert.alert("Invalid Phone", "Customer phone must be exactly 10 digits.");
      return;
    }

    const userPhone = await AsyncStorage.getItem("phone");

    const result = await dispatch(
      addCustomerThunk({ name, customerPhone, address, userPhone })
    );

    if (addCustomerThunk.fulfilled.match(result)) {
      Alert.alert("Success ✅", "Customer added successfully!", [
        { text: "OK", onPress: () => navigation.navigate("Home") },
      ]);
    } else {
      Alert.alert("Error", result.payload || "Failed to add customer");
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={Styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 20}
    >
      {/* Header stays outside the scroll so it's always visible */}
      <View style={Styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={Styles.backBtn}>
          <Text style={Styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={Styles.title}>Add Customer</Text>
        <Text style={Styles.subtitle}>Fill in the details below</Text>
      </View>

      <ScrollView
        contentContainerStyle={Styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={Styles.formCard}>
          {/* Name */}
          <View style={Styles.formGroup}>
            <Text style={Styles.label}>Customer Name</Text>
            <View style={Styles.inputWrapper}>
              <Text style={Styles.icon}>👤</Text>
              <TextInput
                style={Styles.input}
                placeholder="Full name"
                placeholderTextColor="#aaa"
                value={name}
                onChangeText={setName}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Phone */}
          <View style={Styles.formGroup}>
            <Text style={Styles.label}>Phone Number</Text>
            <View style={Styles.inputWrapper}>
              <Text style={Styles.icon}>📱</Text>
              <TextInput
                style={Styles.input}
                keyboardType="phone-pad"
                maxLength={10}
                placeholder="10-digit number"
                placeholderTextColor="#aaa"
                value={customerPhone}
                onChangeText={setCustomerPhone}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Address */}
          <View style={Styles.formGroup}>
            <Text style={Styles.label}>Address</Text>
            <View style={[Styles.inputWrapper, Styles.addressWrapper]}>
              <Text style={[Styles.icon, { marginTop: 4 }]}>📍</Text>
              <TextInput
                style={[Styles.input, Styles.addressInput]}
                placeholder="Enter address"
                placeholderTextColor="#aaa"
                value={address}
                onChangeText={setAddress}
                multiline
                returnKeyType="done"
              />
            </View>
          </View>
        </View>

        {/* Submit button INSIDE ScrollView so it scrolls into view above the keyboard */}
        <TouchableOpacity
          style={[Styles.submitButton, loading && Styles.submitButtonDisabled]}
          onPress={handleAddCustomer}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={Styles.submitText}>
            {loading ? "Adding…" : "Add Customer ✓"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const Styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4f8" },
  header: {
    backgroundColor: "#3498db",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
  },
  backBtn: { marginBottom: 8 },
  backBtnText: { color: "#d6eaf8", fontSize: 14, fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "800", color: "#fff", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#d6eaf8" },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  formGroup: { marginBottom: 20 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1a2533",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e0e6ed",
    paddingHorizontal: 12,
  },
  addressWrapper: { alignItems: "flex-start", paddingVertical: 8 },
  icon: { fontSize: 18, marginRight: 10 },
  input: {
    flex: 1,
    color: "#1a2533",
    fontSize: 15,
    paddingVertical: 13,
  },
  addressInput: {
    textAlignVertical: "top",
    minHeight: 72,
    paddingTop: 8,
  },
  submitButton: {
    backgroundColor: "#27ae60",
    borderRadius: 14,
    paddingVertical: 16,
    elevation: 3,
    shadowColor: "#27ae60",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  submitButtonDisabled: {
    backgroundColor: "#a8d5b8",
    elevation: 0,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 0.3,
  },
});