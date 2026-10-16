// components/search/DefinitionBox.tsx
//
// Search "answer boxes", like the ones a search engine shows above results:
//  1. Dictionary box  — the dish name, pronunciation (if the recipe has one),
//     part of speech / food type, and a short definition.
//  2. Knowledge panel — a summary card with photo, quick facts, key
//     ingredients, and related dishes.
// Both are built from the best-matching recipe, so no extra data is needed.
import { View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { BookOpen, Clock, Users, MapPin, Gauge } from 'lucide-react-native';
import { resolveRecipeImageSource } from '../../lib/recipeImage';
import type { Recipe } from '../../types';
import { ResponsiveText as Text } from '../ResponsiveText';

// Optional fields an admin may have saved on the recipe document.
type RichRecipe = Recipe & { foodType?: string; pronunciation?: string };

type Props = {
  query: string;
  results: Recipe[];
  onPressRecipe: (recipe: Recipe) => void;
  onSearchTerm: (term: string) => void;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function DefinitionBox({ query, results, onPressRecipe, onSearchTerm }: Props) {
  const top = results[0] as RichRecipe | undefined;
  if (!top || query.trim().length < 2) return null;

  const imageSource = resolveRecipeImageSource(top.heroImageUrl);
  const totalMins = (top.prepTimeMinutes ?? 0) + (top.cookTimeMinutes ?? 0);
  const keyIngredients = (top.keyIngredientNames ?? []).slice(0, 5);
  const related = results.slice(1, 4);

  return (
    <View className="mb-2">
      {/* Dictionary box */}
      <View className="bg-white dark:bg-[#2A211A] rounded-2xl p-4 mb-3">
        <View className="flex-row items-center gap-2 mb-2">
          <BookOpen size={14} color="#D97706" />
          <Text className="text-[10px] font-semibold text-[#D97706] tracking-wider">DEFINITION</Text>
        </View>
        <Text className="text-2xl font-bold text-[#3A2A1A] dark:text-[#F5EBDD]">{top.title}</Text>
        <View className="flex-row items-center gap-2 mt-1 mb-2">
          {!!top.pronunciation && (
            <Text className="text-sm text-[#8A6D4E] dark:text-[#B8A48C]">/{top.pronunciation}/</Text>
          )}
          <Text className="text-sm italic text-[#8A6D4E] dark:text-[#B8A48C]">
            noun{top.foodType ? ` · ${top.foodType}` : ''}
          </Text>
        </View>
        {!!top.description && (
          <Text className="text-[#3A2A1A] dark:text-[#F5EBDD]" numberOfLines={4}>
            {top.description}
          </Text>
        )}
      </View>

      {/* Knowledge panel */}
      <Pressable
        onPress={() => onPressRecipe(top)}
        className="bg-white dark:bg-[#2A211A] rounded-2xl overflow-hidden mb-3"
      >
        {imageSource && (
          <Image source={imageSource} style={{ width: '100%', height: 140 }} contentFit="cover" />
        )}
        <View className="p-4">
          <Text className="text-lg font-bold text-[#3A2A1A] dark:text-[#F5EBDD]">{top.title}</Text>
          <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] mb-3">
            {top.foodType ?? 'Recipe'} · {top.region}
          </Text>

          <View className="flex-row flex-wrap gap-x-5 gap-y-2 mb-3">
            <Fact icon={<MapPin size={13} color="#8A6D4E" />} label="Region" value={top.region} />
            <Fact icon={<Clock size={13} color="#8A6D4E" />} label="Total time" value={`${totalMins} mins`} />
            <Fact icon={<Users size={13} color="#8A6D4E" />} label="Serves" value={String(top.baseServings)} />
            <Fact icon={<Gauge size={13} color="#8A6D4E" />} label="Difficulty" value={top.difficulty} />
          </View>

          {keyIngredients.length > 0 && (
            <>
              <Text className="text-xs font-semibold text-[#3A2A1A] dark:text-[#F5EBDD] mb-1">
                Key ingredients
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-3">
                {keyIngredients.map((name) => (
                  <View key={name} className="bg-[#FFF3E0] dark:bg-[#3A2A1A] rounded-full px-2.5 py-1">
                    <Text className="text-[11px] text-[#D97706]">{cap(name)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {related.length > 0 && (
            <>
              <Text className="text-xs font-semibold text-[#3A2A1A] dark:text-[#F5EBDD] mb-1">People also search</Text>
              <View className="flex-row flex-wrap gap-2">
                {related.map((r) => (
                  <Pressable
                    key={r.id}
                    onPress={() => onSearchTerm(r.title)}
                    className="border border-[#F5EBDD] dark:border-[#3A2A1A] rounded-full px-3 py-1"
                  >
                    <Text className="text-[11px] text-[#3A2A1A] dark:text-[#F5EBDD]">{r.title}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </View>
      </Pressable>
    </View>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      {icon}
      <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C]">
        {label}: <Text className="text-[#3A2A1A] dark:text-[#F5EBDD] font-medium">{value}</Text>
      </Text>
    </View>
  );
}