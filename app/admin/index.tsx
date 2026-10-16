// app/admin/index.tsx
//
// "Add Recipe" tab: lists existing recipes (tap to edit, trash to delete) and
// has a button to create a new one.
import { useMemo, useState } from 'react';
import { View, Pressable, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTopInset } from '../../hooks/useTopInset';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Download, Search as SearchIcon, X } from 'lucide-react-native';
import { getAllRecipesForAdmin, deleteRecipe, seedMockRecipes } from '../../services/adminRecipeService';
import ThemedBackground from '../../components/ThemedBackground';
import { ResponsiveText as Text, ResponsiveTextInput as TextInput } from '../../components/ResponsiveText';

export default function AdminRecipeListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState('');

  const { data: recipes, isLoading } = useQuery({
    queryKey: ['admin-recipes'],
    queryFn: getAllRecipesForAdmin,
  });

  // Search by title, region, or status (draft / published).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = recipes ?? [];
    if (!q) return list;
    return list.filter((r: any) =>
      [r.title, r.region, r.status, r.foodType].some((v) => String(v ?? '').toLowerCase().includes(q))
    );
  }, [recipes, search]);

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete Recipe', `Are you sure you want to delete "${title}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRecipe(id);
            // Refresh what users see too (Home, Search, Favorites), not just the admin list.
            queryClient.invalidateQueries();
          } catch (err: any) {
            Alert.alert('Delete failed', err.message);
          }
        },
      },
    ]);
  };

  const handleSeed = () => {
    Alert.alert(
      'Import Built-in Recipes',
      'This copies the 8 built-in sample recipes into your database so you can manage them here. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            setSeeding(true);
            try {
              const { created, skippedImages, alreadyExisted } = await seedMockRecipes();
              queryClient.invalidateQueries({ queryKey: ['admin-recipes'] });
              Alert.alert(
                'Done',
                `Imported ${created} recipe${created === 1 ? '' : 's'}.` +
                  (alreadyExisted > 0 ? ` ${alreadyExisted} were already imported and left as-is.` : '') +
                  (skippedImages > 0
                    ? ` ${skippedImages} of them need a photo re-added via Edit Recipe (they used a bundled image that can't transfer automatically).`
                    : '')
              );
            } catch (err: any) {
              Alert.alert('Import failed', err.message);
            } finally {
              setSeeding(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ThemedBackground>
      <View className="flex-1 px-4" style={{ paddingTop: topInset + 16 }}>
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-xl font-bold text-[#3A2A1A] dark:text-[#F5EBDD]">Manage Recipes</Text>
          <Pressable
            onPress={() => router.push('/admin/recipe-form')}
            className="flex-row items-center gap-1 bg-[#D97706] rounded-full px-3 py-2"
          >
            <Plus size={16} color="white" />
            <Text className="text-white text-xs font-semibold">Add Recipe</Text>
          </Pressable>
        </View>

        <View className="flex-row items-center bg-white dark:bg-[#2A211A] rounded-2xl px-4 py-3 gap-2 mb-3">
          <SearchIcon size={18} color="#8A6D4E" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search recipes by name, region, or status..."
            placeholderTextColor="#B8A48C"
            autoCapitalize="none"
            returnKeyType="search"
            className="flex-1 text-[#3A2A1A] dark:text-[#F5EBDD]"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <X size={16} color="#8A6D4E" />
            </Pressable>
          )}
        </View>

        {isLoading && <Text className="text-[#8A6D4E] dark:text-[#B8A48C]">Loading...</Text>}

        {!isLoading && (recipes ?? []).length === 0 && (
          <Pressable
            onPress={handleSeed}
            disabled={seeding}
            className="bg-white dark:bg-[#2A211A] border border-dashed border-[#D97706] rounded-2xl p-4 mb-3 flex-row items-center justify-center gap-2"
          >
            {seeding ? (
              <ActivityIndicator color="#D97706" />
            ) : (
              <>
                <Download size={16} color="#D97706" />
                <Text className="text-[#D97706] font-semibold text-sm">Import the 8 built-in recipes</Text>
              </>
            )}
          </Pressable>
        )}

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            !isLoading && (recipes ?? []).length > 0 ? (
              <Text className="text-[#8A6D4E] dark:text-[#B8A48C] text-center mt-8">
                No recipes match “{search.trim()}”.
              </Text>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/admin/recipe-form', params: { id: item.id } })}
              className="bg-white dark:bg-[#2A211A] rounded-2xl p-4 mb-2 flex-row items-center justify-between"
            >
              <View>
                <Text className="text-[#3A2A1A] dark:text-[#F5EBDD] font-semibold">{item.title}</Text>
                <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C]">{item.status}</Text>
              </View>
              <Pressable onPress={() => handleDelete(item.id, item.title)} hitSlop={8} className="p-2">
                <Trash2 size={18} color="#DC2626" />
              </Pressable>
            </Pressable>
          )}
        />
      </View>
    </ThemedBackground>
  );
}