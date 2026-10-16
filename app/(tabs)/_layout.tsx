// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { Home, Search, Heart, User } from 'lucide-react-native';
import { useThemeStore } from '../../store/useThemeStore';
import { responsiveFontSize } from '../../components/ResponsiveText';

export default function TabsLayout() {
  const isDark = useThemeStore((s) => s.isDark);
  const { width } = useWindowDimensions();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#D97706',
        tabBarInactiveTintColor: isDark ? '#B8A48C' : '#8A6D4E',
        tabBarLabelStyle: { fontSize: responsiveFontSize(10, width) },
        tabBarStyle: {
          // Dark bar uses the same base color as the dark background image.
          backgroundColor: isDark ? '#161502' : '#ede1d3',
          borderTopColor: isDark ? '#3A2A1A' : '#7e776d',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color, size }) => <Heart color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}