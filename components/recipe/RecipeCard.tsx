// components/recipe/RecipeCard.tsx
import { View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Clock, ImageOff } from 'lucide-react-native';
import type { Recipe } from '../../types';
import { resolveRecipeImageSource } from '../../lib/recipeImage';
import { ResponsiveText as Text } from '../ResponsiveText';

export function RecipeCard({ recipe, onPress }: { recipe: Recipe; onPress: () => void }) {
  const imageSource = resolveRecipeImageSource(recipe.heroImageUrl);

  return (
    <Pressable
      onPress={onPress}
      className="flex-row bg-white/75 dark:bg-[#2A211A]/80 border border-white/60 dark:border-[#3D2F22] rounded-2xl mb-3 overflow-hidden"
    >
      {imageSource ? (
        <Image
          source={imageSource}
          style={{ width: 100, height: 100 }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
        />
      ) : (
        <View className="items-center justify-center bg-[#FFF3E0] dark:bg-[#33291F]" style={{ width: 100, height: 100 }}>
          <ImageOff size={22} color="#D97706" />
        </View>
      )}
      <View className="flex-1 p-3 justify-center">
        <Text numberOfLines={1} className="text-base font-semibold text-[#3A2A1A] dark:text-[#F5EBDD]">
          {recipe.title}
        </Text>
        <Text numberOfLines={2} className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] mt-1">
          {recipe.description}
        </Text>
        <View className="flex-row items-center gap-1 mt-2">
          <Clock size={12} color="#D97706" />
          <Text className="text-xs text-[#D97706]">
            {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min
          </Text>
          <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] ml-2">• {recipe.region}</Text>
        </View>
      </View>
    </Pressable>
  );
}