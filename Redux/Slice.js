import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

  const BASE = "https://digibackend.gonakli.com";
 // const BASE = "http://10.131.38.99:5005";

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const fetchCustomers = createAsyncThunk(
  "auth/fetchCustomers",
  async (token, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE}/getCustomer/${token}`);
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.reason || "Failed to fetch customers");
      }
      const data = await res.json();
      return {
        customers: data.customers || [],
        userName: data.userName || "",
        profilePic: data.profilePic || "",
      };
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

export const fetchProfile = createAsyncThunk(
  "auth/fetchProfile",
  async (token, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE}/getProfile/${token}`);
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.reason || "Failed to fetch profile");
      }
      return await res.json();
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

export const requestLoginOtp = createAsyncThunk(
  "auth/requestLoginOtp",
  async (phone, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE}/loginOtp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.reason || "Failed to send OTP");
      }
      const data = await res.json();
      return {
        phone:data.phone,
        tempOtp:data.otp
      }
        
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

export const validateOtp = createAsyncThunk(
  "auth/validateOtp",
  async ({ phone, otp }, { dispatch, rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE}/otpValidator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      if (res.status !== 200) {
        const err = await res.json();
        return rejectWithValue(err.reason || "Invalid OTP");
      }
      const data = await res.json();
      dispatch(fetchCustomers(data.token));
      return {
        token: data.token,
        phone,
        isNewUser: data.isNewUser,
        userName: data.userName || "",
      };
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

export const addCustomerThunk = createAsyncThunk(
  "auth/addCustomer",
  async ({ name, customerPhone, address, userPhone }, { dispatch, getState, rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE}/addCustomer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, customerPhone, address, phone: userPhone }),
      });
      if (res.status !== 201) {
        const err = await res.json();
        return rejectWithValue(err.reason || "Failed to add customer");
      }
      const token = getState().authOperations.token;
      dispatch(fetchCustomers(token));
      return true;
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

export const addTransactionThunk = createAsyncThunk(
  "auth/addTransaction",
  async ({ customerId, amount, note, transactionType, phone, userToken }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE}/addTransaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, amount, note, transactionType, phone, userToken }),
      });
      if (res.status !== 201) {
        const err = await res.json();
        return rejectWithValue(err.reason || "Failed to add transaction");
      }
      return {
        customerId,
        transaction: {
          _id: Date.now().toString(),
          amount,
          note: note || "No note",
          type: transactionType,
          date: new Date().toISOString(),
        },
      };
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

export const deleteCustomerThunk = createAsyncThunk(
  "auth/deleteCustomer",
  async ({ authToken, customerId }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE}/deleteCustomer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authToken, customerId }),
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.reason || "Failed to delete customer");
      }
      return customerId;
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

export const updateNameThunk = createAsyncThunk(
  "auth/updateName",
  async ({ authToken, name }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE}/updateName`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authToken, name }),
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.reason || "Failed to update name");
      }
      const data = await res.json();
      return data.name;
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

export const updateProfilePicThunk = createAsyncThunk(
  "auth/updateProfilePic",
  async ({ authToken, profilePicPath }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE}/updateProfilePic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authToken, profilePicPath }),
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.reason || "Failed to update profile picture");
      }
      const data = await res.json();
      return data.profilePic;
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

export const submitFeedbackThunk = createAsyncThunk(
  "auth/submitFeedback",
  async ({ authToken, feedback }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE}/submitFeedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authToken, feedback }),
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.reason || "Failed to submit feedback");
      }
      return true;
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

export const logoutThunk = createAsyncThunk(
  "auth/logoutUser",
  async (authToken, { rejectWithValue }) => {
    try {
      await fetch(`${BASE}/logoutUser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authToken }),
      });
      return true;
    } catch (err) {
      // Even on network failure, proceed with local logout
      return true;
    }
  }
);

export const deleteAccountThunk = createAsyncThunk(
  "auth/deleteAccount",
  async ({ authToken, phone }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE}/deleteAccount`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authToken, phone }),
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.reason || "Failed to delete account");
      }
      return true;
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

export const setPinThunk = createAsyncThunk(
  "auth/setPin",
  async ({ authToken, pin }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE}/setPin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authToken, pin }),
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.reason || "Failed to set PIN");
      }
      const data = await res.json();
      return data.hasPin;
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

export const verifyPinThunk = createAsyncThunk(
  "auth/verifyPin",
  async ({ authToken, pin }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE}/verifyPin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authToken, pin }),
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.reason || "Incorrect PIN");
      }
      return true;
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const initialState = {
  phone: null,
  tempOtp:null,
  token: null,
  userName: "",
  profilePic: "",
  hasPin: false,
  customerData: [],
  loading: false,
  customersLoading: false,
  settingsLoading: false,
  error: null,
  unlocked: false
};

const Slice = createSlice({
  name: "SLICE",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    unlockedPin(state){
      console.log("come here");
      state.unlocked = true;
      console.log(state.unlocked);
    },
    logout(state) {
      return { ...initialState };
    },
    setUserName(state, action) {
      state.userName = action.payload;
    },
  },
  extraReducers: (builder) => {
    // requestLoginOtp
    builder
      .addCase(requestLoginOtp.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(requestLoginOtp.fulfilled, (state, action) => { state.loading = false; state.phone = action.payload.phone; state.tempOtp = action.payload.tempOtp })
      .addCase(requestLoginOtp.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    // validateOtp
    builder
      .addCase(validateOtp.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(validateOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token || AsyncStorage.getItem("token");
        state.phone = action.payload.phone || AsyncStorage.getItem("phone");
        state.userName = action.payload.userName || "";
      })
      .addCase(validateOtp.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    // fetchCustomers
    builder
      .addCase(fetchCustomers.pending, (state) => { state.customersLoading = true; state.error = null; })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.customersLoading = false;
        state.customerData = action.payload.customers;
        if (action.payload.userName) state.userName = action.payload.userName;
        if (action.payload.profilePic) state.profilePic = action.payload.profilePic;
      })
      .addCase(fetchCustomers.rejected, (state, action) => { state.customersLoading = false; state.error = action.payload; });

    // fetchProfile
    builder
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.userName = action.payload.name || "";
        state.profilePic = action.payload.profilePic || "";
        state.hasPin = action.payload.hasPin || false;
      });

    // addCustomerThunk
    builder
      .addCase(addCustomerThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(addCustomerThunk.fulfilled, (state) => { state.loading = false; })
      .addCase(addCustomerThunk.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    // addTransactionThunk
    builder
      .addCase(addTransactionThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(addTransactionThunk.fulfilled, (state, action) => {
        state.loading = false;
        const { customerId, transaction } = action.payload;
        const customer = state.customerData.find((c) => c._id === customerId);
        if (customer) {
          if (!customer.transactions) customer.transactions = [];
          customer.transactions.push(transaction);
        }
      })
      .addCase(addTransactionThunk.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    // deleteCustomerThunk
    builder
      .addCase(deleteCustomerThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteCustomerThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.customerData = state.customerData.filter((c) => c._id !== action.payload);
      })
      .addCase(deleteCustomerThunk.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    // updateNameThunk
    builder
      .addCase(updateNameThunk.pending, (state) => { state.settingsLoading = true; state.error = null; })
      .addCase(updateNameThunk.fulfilled, (state, action) => { state.settingsLoading = false; state.userName = action.payload; })
      .addCase(updateNameThunk.rejected, (state, action) => { state.settingsLoading = false; state.error = action.payload; });

    // updateProfilePicThunk
    builder
      .addCase(updateProfilePicThunk.pending, (state) => { state.settingsLoading = true; })
      .addCase(updateProfilePicThunk.fulfilled, (state, action) => { state.settingsLoading = false; state.profilePic = action.payload; })
      .addCase(updateProfilePicThunk.rejected, (state, action) => { state.settingsLoading = false; state.error = action.payload; });

    // submitFeedbackThunk
    builder
      .addCase(submitFeedbackThunk.pending, (state) => { state.settingsLoading = true; state.error = null; })
      .addCase(submitFeedbackThunk.fulfilled, (state) => { state.settingsLoading = false; })
      .addCase(submitFeedbackThunk.rejected, (state, action) => { state.settingsLoading = false; state.error = action.payload; });

    // logoutThunk
    builder.addCase(logoutThunk.fulfilled, () => ({ ...initialState }));

    // deleteAccountThunk
    builder
      .addCase(deleteAccountThunk.pending, (state) => { state.settingsLoading = true; state.error = null; })
      .addCase(deleteAccountThunk.fulfilled, () => ({ ...initialState }))
      .addCase(deleteAccountThunk.rejected, (state, action) => { state.settingsLoading = false; state.error = action.payload; });

    // setPinThunk
    builder
      .addCase(setPinThunk.pending, (state) => { state.settingsLoading = true; state.error = null; })
      .addCase(setPinThunk.fulfilled, (state, action) => { state.settingsLoading = false; state.hasPin = action.payload; })
      .addCase(setPinThunk.rejected, (state, action) => { state.settingsLoading = false; state.error = action.payload; });

    // verifyPinThunk
    builder
      .addCase(verifyPinThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(verifyPinThunk.fulfilled, (state) => { state.loading = false; })
      .addCase(verifyPinThunk.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
  },
});

export const { clearError, logout, setUserName, unlockedPin } = Slice.actions;
export default Slice.reducer;