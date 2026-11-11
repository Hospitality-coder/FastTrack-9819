import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: { fontFamily: Fonts.bodyBold, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: "#0A120B",
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "web" ? 64 : undefined,
          paddingTop: 6,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="fast"
        options={{
          title: "Fast",
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "timer" : "timer-outline"} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="food"
        options={{
          title: "Food",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "restaurant" : "restaurant-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="water"
        options={{
          title: "Water",
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "water" : "water-outline"} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="weight"
        options={{
          title: "Weight",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "barbell" : "barbell-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
