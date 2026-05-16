import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";

/**
 * ── TokenContext ─────────────────────────────────────────────────────────
 * Manages persistent token storage across app restarts.
 * Syncs between AsyncStorage and Redux state.
 * 
 * Usage:
 *   <TokenProvider>
 *     <App />
 *   </TokenProvider>
 * 
 * In components:
 *   const { token, isTokenLoaded, updateToken } = useToken();
 * ─────────────────────────────────────────────────────────────────────────
 */

const TokenContext = createContext();

export function TokenProvider({ children }) {
  const [token, setToken] = useState(null);
  const [isTokenLoaded, setIsTokenLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Load token from AsyncStorage on app start
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem("token");
        const storedPhone = await AsyncStorage.getItem("phone");
        
        setToken(storedToken);
        setError(null);
      } catch (err) {
        console.error("❌ Token loading error:", err);
        setError(err.message);
      } finally {
        setIsTokenLoaded(true);
      }
    })();
  }, []);

  // Update token in both memory and storage
  const updateToken = async (newToken) => {
    try {
      setToken(newToken);
      if (newToken) {
        await AsyncStorage.setItem("token", newToken);
      } else {
        await AsyncStorage.removeItem("token");
      }
      setError(null);
    } catch (err) {
      console.error("❌ Token update error:", err);
      setError(err.message);
    }
  };

  // Clear token on logout
  const clearToken = async () => {
    try {
      setToken(null);
      await AsyncStorage.multiRemove(["token", "phone"]);
      setError(null);
    } catch (err) {
      console.error("❌ Token clear error:", err);
      setError(err.message);
    }
  };

  const value = {
    token,
    isTokenLoaded,
    error,
    updateToken,
    clearToken,
    isAuthenticated: !!token && isTokenLoaded,
  };

  return (
    <TokenContext.Provider value={value}>
      {children}
    </TokenContext.Provider>
  );
}

/**
 * Hook to access token context in any component
 * 
 * Example:
 *   const { token, isTokenLoaded } = useToken();
 *   
 *   if (!isTokenLoaded) return <LoadingScreen />;
 *   if (!token) return <LoginScreen />;
 *   return <HomeScreen />;
 */
export function useToken() {
  const context = useContext(TokenContext);
  if (!context) {
    throw new Error("❌ useToken must be used within TokenProvider");
  }
  return context;
}

export default TokenContext;