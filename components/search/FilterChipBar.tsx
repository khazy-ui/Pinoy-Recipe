// components/search/FilterChipBar.tsx
import { ScrollView, Pressable } from 'react-native';
import type { MealType } from '../../types';
import { ResponsiveText as Text } from '../ResponsiveText';

const MEAL_TYPES: MealType[] = ['Ulam', 'Merienda', 'Kakanin', 'Fiesta Specials', 'Breakfast', 'Soup'];

interface Props {
  selectedMealTypes: MealType[];
  onToggleMealType: (mealType: MealType) => void;
}

export function FilterChipBar({ selectedMealTypes, onToggleMealType }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ gap: 8, paddingVertical: 8, alignItems: 'flex-start' }}
    >
      {MEAL_TYPES.map((mealType) => (
        <Chip
          key={mealType}
          label={mealType}
          active={selectedMealTypes.includes(mealType)}
          onPress={() => onToggleMealType(mealType)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`min-w-[96px] min-h-[40px] shrink-0 items-center justify-center px-3 py-2 rounded-xl border ${
        active ? 'bg-[#D97706] border-[#D97706]' : 'bg-white dark:bg-[#2A211A] border-[#F0E4D4] dark:border-[#3A2A1A]'
      }`}
    >
      <Text className={`text-xs text-center ${active ? 'text-white' : 'text-[#3A2A1A] dark:text-[#F5EBDD]'}`}>{label}</Text>
    </Pressable>
  );
}