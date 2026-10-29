// components/search/FilterChipBar.tsx
import { View, Pressable } from 'react-native';
import type { MealType, DietaryTag } from '../../types';
import { ResponsiveText as Text } from '../ResponsiveText';

const MEAL_TYPES: MealType[] = ['Ulam', 'Merienda', 'Kakanin', 'Fiesta Specials', 'Breakfast', 'Soup'];
const DIETARY_TAGS: DietaryTag[] = ['Vegetarian', 'Vegan', 'Pork-Free', 'Seafood', 'Gluten-Free'];

interface Props {
  selectedMealTypes: MealType[];
  selectedDietaryTags: DietaryTag[];
  onToggleMealType: (mealType: MealType) => void;
  onToggleDietaryTag: (tag: DietaryTag) => void;
}

export function FilterChipBar({
  selectedMealTypes,
  selectedDietaryTags,
  onToggleMealType,
  onToggleDietaryTag,
}: Props) {
  return (
    <View className="flex-row flex-wrap justify-between gap-y-2 py-2">
      {MEAL_TYPES.map((mealType) => (
        <Chip
          key={mealType}
          label={mealType}
          active={selectedMealTypes.includes(mealType)}
          onPress={() => onToggleMealType(mealType)}
        />
      ))}
      {DIETARY_TAGS.map((tag) => (
        <Chip
          key={tag}
          label={tag}
          active={selectedDietaryTags.includes(tag)}
          onPress={() => onToggleDietaryTag(tag)}
        />
      ))}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`w-[31%] min-h-[40px] items-center justify-center px-2 py-2 rounded-xl border ${
        active ? 'bg-[#D97706] border-[#D97706]' : 'bg-white dark:bg-[#2A211A] border-[#F0E4D4] dark:border-[#3A2A1A]'
      }`}
    >
      <Text className={`text-xs text-center ${active ? 'text-white' : 'text-[#3A2A1A] dark:text-[#F5EBDD]'}`}>{label}</Text>
    </Pressable>
  );
}