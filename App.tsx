import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Login from './Components/Login';
import Otp from './Components/Otp';
import ReduxProvider from './Redux/Provider';
import { TokenProvider, useToken } from './Redux/TokenContext';
import Home from './Components/Home';
import AddCustomer from './Components/AddCustomer';
import ViewCustomerData from './Components/ViewCustomerData';
import Settings from './Components/Settings';
import FirstLoginName from './Components/FirstLoginName';
import AppLock from './Components/AppLock';

const Stack = createNativeStackNavigator();


function RootNavigator() {


  return (
    <Stack.Navigator
      initialRouteName={"Home"}
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animationEnabled: true,
      }}
    >
     
          <Stack.Screen 
            name="Login" 
            component={Login} 
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen 
            name="Otp" 
            component={Otp} 
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen 
            name="FirstLoginName" 
            component={FirstLoginName} 
            options={{ gestureEnabled: false }}
          />
        
          <Stack.Screen 
            name="AppLock" 
            component={AppLock}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen 
            name="Home" 
            component={Home}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen 
            name="AddCustomer" 
            component={AddCustomer}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen 
            name="ViewCustomerData" 
            component={ViewCustomerData}
            options={{ gestureEnabled: true }}
          />
          <Stack.Screen 
            name="Settings" 
            component={Settings}
            options={{ gestureEnabled: true }}
          />
       
    </Stack.Navigator>
  );
}

/**
 * ── Main App Component ─────────────────────────────────────────────────
 * Wraps everything with Redux and Token providers
 */
function AppContent() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ReduxProvider>
      <TokenProvider>
        <AppContent />
      </TokenProvider>
    </ReduxProvider>
  );
}