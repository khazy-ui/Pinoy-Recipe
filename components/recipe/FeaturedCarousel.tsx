// components/recipe/FeaturedCarousel.tsx
import { ScrollView, View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { ImageOff } from 'lucide-react-native';
import type { Recipe } from '../../types';
import { resolveRecipeImageSource } from '../../lib/recipeImage';
import { ResponsiveText as Text } from '../ResponsiveText';

interface Props {
  recipes: Recipe[];
  onPressRecipe: (recipe: Recipe) => void;
}

export function FeaturedCarousel({ recipes, onPressRecipe }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      className="mb-4"
    >
      {recipes.map((recipe) => {
        const imageSource = resolveRecipeImageSource(recipe.heroImageUrl);
        return (
          <Pressable
            key={recipe.id}
            onPress={() => onPressRecipe(recipe)}
            style={{ width: 220 }}
            className="rounded-2xl overflow-hidden bg-white/75 dark:bg-[#2A211A]/80 border border-white/60 dark:border-[#3D2F22]"
          >
            {imageSource ? (
              <Image
                source={imageSource}
                style={{ width: 220, height: 140 }}
                contentFit="cover"
              />
            ) : (
              <View className="items-center justify-center bg-[#FFF3E0] dark:bg-[#33291F]" style={{ width: 220, height: 140 }}>
                <ImageOff size={28} color="#D97706" />
              </View>
            )}
            <View className="p-2">
              <Text numberOfLines={1} className="text-sm font-semibold text-[#3A2A1A] dark:text-[#F5EBDD]">
                {recipe.title}
              </Text>
              <Text className="text-xs text-[#D97706]">{recipe.region}</Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}