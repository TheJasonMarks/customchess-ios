import { Stack } from 'expo-router';
import { PurchaseProvider } from '../src/contexts/PurchaseContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React from 'react';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PurchaseProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#1a1a2e' },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="game" />
          <Stack.Screen name="customize" />
          <Stack.Screen name="saved-games" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="store" />
        </Stack>
      </PurchaseProvider>
    </SafeAreaProvider>
  );
}
