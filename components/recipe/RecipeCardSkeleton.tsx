// components/recipe/RecipeCardSkeleton.tsx
import { View } from 'react-native';

export function RecipeCardSkeleton() {
  return (
    <View className="flex-row bg-white/75 dark:bg-[#2A211A]/80 border border-white/60 dark:border-[#3D2F22] rounded-2xl mb-3 overflow-hidden">
      <View className="w-[100px] h-[100px] bg-[#F0E4D4] dark:bg-[#3D2F22]" />
      <View className="flex-1 p-3 justify-center gap-2">
        <View className="h-4 w-3/4 bg-[#F0E4D4] dark:bg-[#3D2F22] rounded" />
        <View className="h-3 w-full bg-[#F0E4D4] dark:bg-[#3D2F22] rounded" />
        <View className="h-3 w-1/2 bg-[#F0E4D4] dark:bg-[#3D2F22] rounded" />
      </View>
    </View>
  );
}