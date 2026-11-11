// System-managed layout — extend in place, never rewrite from scratch.
// Keep the provider chain intact: ErrorBoundary → OneDollarStats → SafeArea → QueryClient.
// To switch navigation, replace only the <Slot /> line with <Stack /> or <Tabs />.
import { useEffect } from "react";
import { Stack } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useFonts } from "expo-font";
import { Unbounded_500Medium, Unbounded_700Bold, Unbounded_900Black } from "@expo-google-fonts/unbounded";
import { Manrope_500Medium, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { Silkscreen_400Regular, Silkscreen_700Bold } from "@expo-google-fonts/silkscreen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "../components/__ErrorBoundary";
import { OneDollarStatsProvider } from "../lib/__analytics";
import { isWeb, startWebSafeArea } from "../lib/__web-safe-area";
import appJson from "../app.json";

const queryClient = new QueryClient();

const applicationId = appJson.expo.extra.applicationId ?? "";
const hostname = applicationId ? `${applicationId}-mobile` : "localhost";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Unbounded_500Medium,
    Unbounded_700Bold,
    Unbounded_900Black,
    Manrope_500Medium,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Silkscreen_400Regular,
    Silkscreen_700Bold,
  });

  useEffect(() => {
    if (isWeb) startWebSafeArea();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#070A07" }}>
        <ActivityIndicator color="#39FF14" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      {/* Runable analytics provider — do not remove, required for analytics tracking */}
      <OneDollarStatsProvider
        config={{
          hostname,
          collectorUrl: "https://r.lilstts.com/events",
          devmode: true,
        }}
      >
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "#070A07" },
                animation: "slide_from_bottom",
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="scan" options={{ presentation: "modal" }} />
              <Stack.Screen name="food-entry" options={{ presentation: "modal" }} />
              <Stack.Screen name="settings" />
              <Stack.Screen name="fast-complete" options={{ presentation: "transparentModal", animation: "fade" }} />
            </Stack>
          </QueryClientProvider>
        </SafeAreaProvider>
      </OneDollarStatsProvider>
    </ErrorBoundary>
  );
}
