// components/recipe/RegionChipRow.tsx
import { ScrollView, Pressable } from 'react-native';
import type { Region } from '../../types';
import { ResponsiveText as Text } from '../ResponsiveText';

const REGIONS: Region[] = ['Luzon', 'Visayas', 'Mindanao', 'Ilocos', 'Bicol', 'Pampanga'];

export function RegionChipRow({
  selectedRegion,
  onSelectRegion,
}: {
  selectedRegion?: Region;
  onSelectRegion: (region: Region) => void;
}) {
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
          className={`rounded-full border px-4 py-2 ${
            selectedRegion === region
              ? 'bg-[#D97706] border-[#D97706]'
              : 'bg-white/75 dark:bg-[#2A211A]/80 border-[#F0E4D4] dark:border-[#3D2F22]'
          }`}
        >
          <Text
            className={`text-sm ${
              selectedRegion === region ? 'text-white' : 'text-[#3A2A1A] dark:text-[#F5EBDD]'
            }`}
          >
            {region}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}