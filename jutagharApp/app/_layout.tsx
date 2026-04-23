import { initializeDeviceAttestation } from "@/security/deviceAttestation";
import { migrateLegacyAsyncStorageTokens } from "@/shared/secureStorage";
import { Stack } from "expo-router";
import { useEffect } from "react";

export default function RootLayout() {
  useEffect(() => {
    void migrateLegacyAsyncStorageTokens();
    void initializeDeviceAttestation();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* You can customize individual screens here */}
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false // Hide header for login screens
        }} 
      />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
