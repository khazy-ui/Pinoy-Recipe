// components/recipe/RegionChipRow.tsx
import { ScrollView, Pressable } from 'react-native';
import type { Region } from '../../types';
import { ResponsiveText as Text } from '../ResponsiveText';

const REGIONS: Region[] = ['Luzon', 'Visayas', 'Mindanao', 'Ilocos', 'Bicol', 'Pampanga'];

export function RegionChipRow({ onSelectRegion }: { onSelectRegion: (region: Region) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      className="mb-2"
    >
      {REGIONS.map((region) => (
        <Pressable
          key={region}
          onPress={() => onSelectRegion(region)}
          className="bg-white/75 dark:bg-[#2A211A]/80 border border-[#F0E4D4] dark:border-[#3D2F22] rounded-full px-4 py-2"
        >
          <Text className="text-sm text-[#3A2A1A] dark:text-[#F5EBDD]">{region}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}