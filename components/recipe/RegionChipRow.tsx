// components/recipe/RegionChipRow.tsx
import { ScrollView, Pressable } from 'react-native';
import type { Region } from '../../types';
import { ResponsiveText as Text } from '../ResponsiveText';

export const REGIONS: Region[] = ['Luzon', 'Visayas', 'Mindanao'];

export function RegionChipRow({
  selectedRegion,
  onSelectRegion,
  large = false,
}: {
  selectedRegion?: Region;
  onSelectRegion: (region: Region) => void;
  large?: boolean;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'flex-start' }}
      className="mb-2"
    >
      {REGIONS.map((region) => (
        <Pressable
          key={region}
          onPress={() => onSelectRegion(region)}
          className={`${large ? 'rounded-xl px-5 py-4 min-w-[112px] items-center' : 'rounded-full px-4 py-2'} border ${
            selectedRegion === region
              ? 'bg-[#D97706] border-[#D97706]'
              : 'bg-white/75 dark:bg-[#2A211A]/80 border-[#F0E4D4] dark:border-[#3D2F22]'
          }`}
        >
          <Text
            className={`${large ? 'font-semibold' : 'text-sm'} ${
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