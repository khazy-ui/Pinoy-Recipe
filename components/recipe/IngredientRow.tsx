// components/recipe/IngredientRow.tsx
import { View } from 'react-native';
import type { Ingredient } from '../../types';
import { ResponsiveText as Text } from '../ResponsiveText';

export function IngredientRow({ ingredient }: { ingredient: Ingredient }) {
  return (
    <View className="flex-row justify-between py-2 border-b border-[#F0E4D4] dark:border-[#3D2F22]">
      <Text className="text-[#3A2A1A] dark:text-[#F5EBDD]">{ingredient.name}</Text>
      <Text className="text-[#8A6D4E] dark:text-[#B8A48C] font-medium">
        {formatQuantity(ingredient.quantity)} {ingredient.unit}
      </Text>
    </View>
  );
}

function formatQuantity(qty: number): string {
  if (Number.isInteger(qty)) return qty.toString();
  return qty.toFixed(2).replace(/\.?0+$/, '');
}