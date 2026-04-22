import { Stack } from "expo-router";

export default function RootLayout() {
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
    </Stack>
  );
}
