// app/admin/recipe-form.tsx
import { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, Image, Alert, ActivityIndicator, Switch } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react-native';
import {
  createRecipe,
  updateRecipe,
  getRecipeForAdmin,
  deleteRecipe,
  uploadRecipeImage,
} from '../../services/adminRecipeService';
import { notifyAllUsersNewRecipe } from '../../services/recipeNotifications';
import { useThemeStore } from '../../store/useThemeStore';
import ThemedBackground from '../../components/ThemedBackground';
import type { Region, Difficulty, Recipe, Ingredient, CookStep } from '../../types';
import { ResponsiveText as Text, ResponsiveTextInput as TextInput } from '../../components/ResponsiveText';

const REGIONS: Region[] = [
  'Luzon',
  'Visayas',
  'Mindanao',
];

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

const FOOD_TYPES = [
  'Main Dish',
  'Side Dish',
  'Appetizer',
  'Sweet',
  'Dessert',
  'Breakfast',
] as const;
type FoodType = (typeof FOOD_TYPES)[number];

type StepTimerInput = { minutes: string; seconds: string };

function getTimerSeconds(input: StepTimerInput): number | undefined | null {
  if (!input.minutes.trim() && !input.seconds.trim()) return undefined;
  if (!/^\d+$/.test(input.minutes || '0') || !/^\d+$/.test(input.seconds || '0')) return null;

  const totalSeconds = Number(input.minutes || 0) * 60 + Number(input.seconds || 0);
  return Number.isSafeInteger(totalSeconds) && totalSeconds > 0 ? totalSeconds : null;
}

const newId = () => Crypto.randomUUID();

// Maps unicode fraction glyphs (¼, ⅘, etc.) to their decimal value, so admins
// can paste/type them for ingredient quantities instead of only plain numbers.
const UNICODE_FRACTIONS: Record<string, number> = {
  '¼': 0.25, '½': 0.5, '¾': 0.75,
  '⅓': 1 / 3, '⅔': 2 / 3,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
  '⅙': 1 / 6, '⅚': 5 / 6,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

// Parses a quantity field as typed by an admin. Plain numbers ("1.5") and
// fractions ("¾", "1 ¾") become decimals, used for serving-scaling math.
// Anything else a cook would naturally write here — a range ("10-14"), an
// approximation ("a pinch"), or text with symbols like "-" or "*" — is kept
// exactly as typed instead of being discarded, since it isn't a single
// scalable number anyway.
function parseQuantityInput(raw: string): number | string {
  const trimmed = raw.trim();
  if (!trimmed) return 0;

  const mixed = trimmed.match(/^(\d+)?\s*([¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])$/);
  if (mixed) {
    const whole = mixed[1] ? Number(mixed[1]) : 0;
    return whole + UNICODE_FRACTIONS[mixed[2]];
  }

  const n = Number(trimmed);
  if (Number.isFinite(n)) return n;

  return trimmed;
}

export default function RecipeFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = !!id;
  const isDark = useThemeStore((s) => s.isDark);
  // Inline-style colors (pills, checkbox, icons) can't use `dark:` classes.
  const cardBg = isDark ? '#2A211A' : 'white';
  const inkColor = isDark ? '#F5EBDD' : '#3A2A1A';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [region, setRegion] = useState<Region | ''>('');
  const [foodType, setFoodType] = useState<FoodType | ''>('');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState('15');
  const [cookTimeMinutes, setCookTimeMinutes] = useState('30');
  const [baseServings, setBaseServings] = useState('4');
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isTrending, setIsTrending] = useState(false);
  const [published, setPublished] = useState(false);
  const [wasPublished, setWasPublished] = useState(false);
  const [notifyUsers, setNotifyUsers] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<CookStep[]>([]);
  const [stepTimerInputs, setStepTimerInputs] = useState<Record<string, StepTimerInput>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(isEditing);

  useEffect(() => {
    if (!id) return;
    getRecipeForAdmin(id).then((recipe) => {
      if (!recipe) return;
      setTitle(recipe.title ?? '');
      setDescription(recipe.description ?? '');
      setRegion(recipe.region ?? '');
      const savedFoodType = (recipe as Recipe & { foodType?: string }).foodType;
      setFoodType(
        savedFoodType === 'Soup'
          ? 'Main Dish'
          : FOOD_TYPES.find((type) => type === savedFoodType) ?? ''
      );
      setPrepTimeMinutes(String(recipe.prepTimeMinutes ?? ''));
      setCookTimeMinutes(String(recipe.cookTimeMinutes ?? ''));
      setBaseServings(String(recipe.baseServings ?? ''));
      setDifficulty(recipe.difficulty ?? 'Easy');
      setImageUri(typeof recipe.heroImageUrl === 'string' ? recipe.heroImageUrl : null);
      setIsFeatured(!!recipe.isFeatured);
      setIsTrending(!!recipe.isTrending);
      setPublished(recipe.status === 'published');
      setWasPublished(recipe.status === 'published');
      setIngredients(recipe.ingredients ?? []);
      setSteps(recipe.steps ?? []);
      setStepTimerInputs(
        Object.fromEntries(
          (recipe.steps ?? []).map((step) => [
            step.id,
            step.timerSeconds && step.timerSeconds > 0
              ? {
                  minutes: String(Math.floor(step.timerSeconds / 60)),
                  seconds: String(step.timerSeconds % 60),
                }
              : { minutes: '', seconds: '' },
          ])
        )
      );
      setLoading(false);
    });
  }, [id]);

  const addIngredient = () => {
    setIngredients((prev) => [...prev, { id: newId(), name: '', quantity: 1, unit: '' }]);
  };

  const updateIngredient = (id: string, patch: Partial<Ingredient>) => {
    setIngredients((prev) => prev.map((ing) => (ing.id === id ? { ...ing, ...patch } : ing)));
  };

  const removeIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((ing) => ing.id !== id));
  };

  const addStep = () => {
    const id = newId();
    setSteps((prev) => [
      ...prev,
      { id, order: prev.length + 1, title: '', instruction: '' },
    ]);
    setStepTimerInputs((prev) => ({ ...prev, [id]: { minutes: '', seconds: '' } }));
  };

  const updateStep = (id: string, patch: Partial<CookStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeStep = (id: string) => {
    setSteps((prev) =>
      prev
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, order: i + 1 })) // keep order sequential after removal
    );
    setStepTimerInputs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo library access to upload a recipe photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        aspect: [4, 3],
        allowsEditing: true,
      });
      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
        setImageMimeType(result.assets[0].mimeType ?? 'image/jpeg');
      }
    } catch (err) {
      Alert.alert('Photo selection failed', err instanceof Error ? err.message : 'Could not open the photo library.');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please give the recipe a title.');
      return;
    }
    if (!region) {
      Alert.alert('Missing region', 'Please select a region.');
      return;
    }
    if (!foodType) {
      Alert.alert('Missing food type', 'Please select a food type, such as Main Dish, Dessert, or Breakfast.');
      return;
    }
    if (ingredients.length === 0 || ingredients.some((ing) => !ing.name.trim())) {
      Alert.alert('Missing ingredients', 'Add at least one ingredient, and make sure each has a name.');
      return;
    }
    if (steps.length === 0 || steps.some((s) => !s.instruction.trim())) {
      Alert.alert('Missing steps', 'Add at least one cooking step, and make sure each has instructions.');
      return;
    }
    const timedSteps = steps.map((step) => ({
      ...step,
      timerSeconds: getTimerSeconds(stepTimerInputs[step.id] ?? { minutes: '', seconds: '' }),
    }));
    if (timedSteps.some((step) => step.timerSeconds === null)) {
      Alert.alert('Invalid step timer', 'Enter a valid time greater than zero using whole minutes and seconds.');
      return;
    }
    setSaving(true);
    try {
      let heroImageUrl = (imageUri ?? '').trim();
      if (heroImageUrl && !/^https?:\/\//i.test(heroImageUrl)) {
        if (!/^(file|content):\/\//i.test(heroImageUrl)) {
          Alert.alert('Invalid photo', 'Choose a photo from your device before saving.');
          return;
        }
        heroImageUrl = await uploadRecipeImage(heroImageUrl, imageMimeType ?? undefined);
      }

      const keyIngredientNames = ingredients
        .filter((ing) => ing.isKeyIngredient)
        .map((ing) => ing.name.trim().toLowerCase());

      const payload: Partial<Recipe> & { foodType: FoodType } = {
        title: title.trim(),
        description: description.trim(),
        region,
        foodType,
        prepTimeMinutes: Number(prepTimeMinutes) || 0,
        cookTimeMinutes: Number(cookTimeMinutes) || 0,
        baseServings: Number(baseServings) || 1,
        difficulty,
        heroImageUrl,
        isFeatured,
        isTrending,
        status: published ? 'published' : 'draft',
        ingredients,
        steps: timedSteps.map((step) => ({
          ...step,
          timerSeconds: step.timerSeconds ?? undefined,
        })),
        keyIngredientNames,
      };

      if (isEditing && id) {
        await updateRecipe(id, payload);
      } else {
        await createRecipe(payload as any);
      }

      // Refresh cached lists (admin list, Home, Search, Favorites, recipe details)
      // so the change shows up right away instead of the old cached data.
      queryClient.invalidateQueries();

      // Only offer/send a notification the first time a recipe becomes visible to users.
      if (notifyUsers && published && !wasPublished) {
        try {
          const count = await notifyAllUsersNewRecipe(title.trim());
          Alert.alert('Recipe saved', `Notified ${count} user${count === 1 ? '' : 's'}.`);
        } catch (err: any) {
          Alert.alert('Recipe saved', `But the notification couldn't be sent: ${err.message}`);
        }
      }
      router.back();
    } catch (err: any) {
      Alert.alert('Save failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert('Delete recipe', `Are you sure you want to delete "${title}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteRecipe(id);
            queryClient.invalidateQueries();
            router.back();
          } catch (err) {
            Alert.alert('Delete failed', err instanceof Error ? err.message : 'Could not delete the recipe.');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#FFF8F0] dark:bg-[#161502] items-center justify-center">
        <ActivityIndicator color="#D97706" />
      </View>
    );
  }

  return (
    <ThemedBackground safeTop>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View className="flex-row items-center gap-3 mb-4">
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            className="bg-white dark:bg-[#2A211A] rounded-full p-2"
          >
            <ArrowLeft size={20} color={inkColor} />
          </Pressable>
          <Text className="text-xl font-bold text-[#3A2A1A] dark:text-[#F5EBDD]">
            {isEditing ? 'Edit Recipe' : 'New Recipe'}
          </Text>
        </View>

        <View className="bg-white dark:bg-[#2A211A] rounded-2xl h-44 items-center justify-center mb-2 overflow-hidden">
          {imageUri ? (
            <Image source={{ uri: imageUri.trim() }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Text className="text-[#8A6D4E] dark:text-[#B8A48C]">Photo preview</Text>
          )}
        </View>
        <Pressable
          onPress={pickImage}
          accessibilityRole="button"
          className="bg-white dark:bg-[#2A211A] rounded-xl py-3 items-center mb-3"
        >
          <Text className="text-sm font-semibold text-[#D97706]">Upload photo</Text>
        </Pressable>

        <FormField label="Title" value={title} onChangeText={setTitle} />
        <FormField label="Description" value={description} onChangeText={setDescription} multiline />

        <View className="mb-3">
          <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] mb-1">Region</Text>
          <View className="flex-row flex-wrap gap-2">
            {REGIONS.map((r) => (
              <Pressable
                key={r}
                onPress={() => setRegion(r)}
                className="rounded-full px-3 py-2"
                style={{ backgroundColor: region === r ? '#D97706' : cardBg }}
              >
                <Text style={{ color: region === r ? 'white' : inkColor, fontSize: 12 }}>{r}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="mb-3">
          <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] mb-1">Food type</Text>
          <View className="flex-row flex-wrap gap-2">
            {FOOD_TYPES.map((t) => (
              <Pressable
                key={t}
                onPress={() => setFoodType(t)}
                className="rounded-full px-3 py-2"
                style={{ backgroundColor: foodType === t ? '#D97706' : cardBg }}
              >
                <Text style={{ color: foodType === t ? 'white' : inkColor, fontSize: 12 }}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="flex-row gap-2">
          <View className="flex-1">
            <FormField label="Prep (min)" value={prepTimeMinutes} onChangeText={setPrepTimeMinutes} keyboardType="numeric" />
          </View>
          <View className="flex-1">
            <FormField label="Cook (min)" value={cookTimeMinutes} onChangeText={setCookTimeMinutes} keyboardType="numeric" />
          </View>
          <View className="flex-1">
            <FormField label="Servings" value={baseServings} onChangeText={setBaseServings} keyboardType="numeric" />
          </View>
        </View>

        <View className="mb-3">
          <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] mb-1">Difficulty</Text>
          <View className="flex-row gap-2">
            {DIFFICULTIES.map((d) => (
              <Pressable
                key={d}
                onPress={() => setDifficulty(d)}
                className="rounded-full px-3 py-2"
                style={{ backgroundColor: difficulty === d ? '#D97706' : cardBg }}
              >
                <Text style={{ color: difficulty === d ? 'white' : inkColor, fontSize: 12 }}>{d}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="mb-3">
          <Text className="text-sm font-semibold text-[#3A2A1A] dark:text-[#F5EBDD] mb-2">Ingredients</Text>

          {ingredients.length === 0 && (
            <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] mb-2">No ingredients yet — tap Add to start the list.</Text>
          )}

          {ingredients.map((ing) => (
            <View key={ing.id} className="bg-white dark:bg-[#2A211A] rounded-xl p-3 mb-2">
              <View className="flex-row items-center gap-2 mb-2">
                <View className="flex-[2]">
                  <TextInput
                    value={ing.name}
                    onChangeText={(t) => updateIngredient(ing.id, { name: t })}
                    placeholder="Ingredient name"
                    placeholderTextColor="#B8A48C"
                    className="bg-[#FFF8F0] dark:bg-[#161502] rounded-lg px-3 py-2 text-[#3A2A1A] dark:text-[#F5EBDD]"
                  />
                </View>
                <Pressable onPress={() => removeIngredient(ing.id)} hitSlop={8} className="p-2">
                  <Trash2 size={16} color="#DC2626" />
                </Pressable>
              </View>
              <View className="flex-row gap-2 mb-2">
                <View className="flex-1">
                  <TextInput
                    value={String(ing.quantity)}
                    onChangeText={(t) =>
                      updateIngredient(ing.id, { quantity: parseQuantityInput(t) as Ingredient['quantity'] })
                    }
                    placeholder="Qty (e.g. 1.5, 1 ¾, or 10-14)"
                    placeholderTextColor="#B8A48C"
                    keyboardType="default"
                    className="bg-[#FFF8F0] dark:bg-[#161502] rounded-lg px-3 py-2 text-[#3A2A1A] dark:text-[#F5EBDD]"
                  />
                </View>
                <View className="flex-1">
                  <TextInput
                    value={ing.unit}
                    onChangeText={(t) => updateIngredient(ing.id, { unit: t })}
                    placeholder="Unit (kg, cup...)"
                    placeholderTextColor="#B8A48C"
                    className="bg-[#FFF8F0] dark:bg-[#161502] rounded-lg px-3 py-2 text-[#3A2A1A] dark:text-[#F5EBDD]"
                  />
                </View>
              </View>
              <TextInput
                value={ing.notes ?? ''}
                onChangeText={(t) => updateIngredient(ing.id, { notes: t })}
                placeholder="Notes (optional, e.g. cut into cubes)"
                placeholderTextColor="#B8A48C"
                className="bg-[#FFF8F0] dark:bg-[#161502] rounded-lg px-3 py-2 text-[#3A2A1A] dark:text-[#F5EBDD] mb-2"
              />
              <Pressable
                onPress={() => updateIngredient(ing.id, { isKeyIngredient: !ing.isKeyIngredient })}
                className="flex-row items-center gap-2"
              >
                <View
                  className="w-5 h-5 rounded items-center justify-center"
                  style={{ backgroundColor: ing.isKeyIngredient ? '#D97706' : isDark ? '#161502' : '#FFF8F0' }}
                >
                  {ing.isKeyIngredient && <Text className="text-white text-xs">✓</Text>}
                </View>
                <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C]">Key ingredient (shown in search filters)</Text>
              </Pressable>
            </View>
          ))}

          <Pressable
            onPress={addIngredient}
            className="flex-row items-center justify-center gap-1 bg-white dark:bg-[#2A211A] border border-dashed border-[#D97706] rounded-xl py-3"
          >
            <Plus size={16} color="#D97706" />
            <Text className="text-sm font-semibold text-[#D97706]">Add Ingredient</Text>
          </Pressable>
        </View>

        <View className="mb-3">
          <Text className="text-sm font-semibold text-[#3A2A1A] dark:text-[#F5EBDD] mb-2">Cooking Steps</Text>
          <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] mb-2">
            Add a timer to any step that needs a specific resting, marinating, or cooking time.
          </Text>

          {steps.length === 0 && (
            <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] mb-2">No steps yet — tap Add to start the list.</Text>
          )}

          {steps.map((step, index) => (
            <View key={step.id} className="bg-white dark:bg-[#2A211A] rounded-xl p-3 mb-2">
              <View className="flex-row items-center gap-2 mb-2">
                <View className="w-6 h-6 rounded-full bg-[#D97706] items-center justify-center">
                  <Text className="text-white text-xs font-bold">{index + 1}</Text>
                </View>
                <View className="flex-1">
                  <TextInput
                    value={step.title}
                    onChangeText={(t) => updateStep(step.id, { title: t })}
                    placeholder="Step title (e.g. Marinate the pork)"
                    placeholderTextColor="#B8A48C"
                    className="bg-[#FFF8F0] dark:bg-[#161502] rounded-lg px-3 py-2 text-[#3A2A1A] dark:text-[#F5EBDD]"
                  />
                </View>
                <Pressable onPress={() => removeStep(step.id)} hitSlop={8} className="p-2">
                  <Trash2 size={16} color="#DC2626" />
                </Pressable>
              </View>
              <TextInput
                value={step.instruction}
                onChangeText={(t) => updateStep(step.id, { instruction: t })}
                placeholder="Instruction"
                placeholderTextColor="#B8A48C"
                multiline
                className="bg-[#FFF8F0] dark:bg-[#161502] rounded-lg px-3 py-2 text-[#3A2A1A] dark:text-[#F5EBDD] mb-2"
              />
              <View className="flex-row items-center gap-2">
                <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C]">Step timer (optional)</Text>
                <View className="flex-row items-center gap-2 flex-1">
                  <View className="flex-1">
                    <TextInput
                      value={stepTimerInputs[step.id]?.minutes ?? ''}
                      onChangeText={(value) =>
                        setStepTimerInputs((prev) => ({
                          ...prev,
                          [step.id]: { ...(prev[step.id] ?? { minutes: '', seconds: '' }), minutes: value },
                        }))
                      }
                      placeholder="Min"
                      placeholderTextColor="#B8A48C"
                      keyboardType="number-pad"
                      className="bg-[#FFF8F0] dark:bg-[#161502] rounded-lg px-3 py-1.5 text-[#3A2A1A] dark:text-[#F5EBDD]"
                    />
                  </View>
                  <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C]">min</Text>
                  <View className="flex-1">
                    <TextInput
                      value={stepTimerInputs[step.id]?.seconds ?? ''}
                      onChangeText={(value) =>
                        setStepTimerInputs((prev) => ({
                          ...prev,
                          [step.id]: { ...(prev[step.id] ?? { minutes: '', seconds: '' }), seconds: value },
                        }))
                      }
                      placeholder="Sec"
                      placeholderTextColor="#B8A48C"
                      keyboardType="number-pad"
                      className="bg-[#FFF8F0] dark:bg-[#161502] rounded-lg px-3 py-1.5 text-[#3A2A1A] dark:text-[#F5EBDD]"
                    />
                  </View>
                  <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C]">sec</Text>
                </View>
              </View>
            </View>
          ))}

          <Pressable
            onPress={addStep}
            className="flex-row items-center justify-center gap-1 bg-white dark:bg-[#2A211A] border border-dashed border-[#D97706] rounded-xl py-3"
          >
            <Plus size={16} color="#D97706" />
            <Text className="text-sm font-semibold text-[#D97706]">Add Step</Text>
          </Pressable>
        </View>

        <ToggleRow label="Featured" value={isFeatured} onValueChange={setIsFeatured} />
        <ToggleRow label="Trending" value={isTrending} onValueChange={setIsTrending} />
        <ToggleRow label="Published (visible to users)" value={published} onValueChange={setPublished} />
        {published && !wasPublished && (
          <ToggleRow label="Notify all users about this recipe" value={notifyUsers} onValueChange={setNotifyUsers} />
        )}

        {isEditing && (
          <Pressable
            onPress={handleDelete}
            disabled={saving || deleting}
            className="flex-row items-center justify-center gap-2 bg-white dark:bg-[#2A211A] border border-[#DC2626] rounded-2xl py-4 items-center mt-3"
          >
            {deleting ? <ActivityIndicator color="#DC2626" /> : <Trash2 size={18} color="#DC2626" />}
            <Text className="text-[#DC2626] font-semibold">Delete recipe</Text>
          </Pressable>
        )}

        <Pressable
          onPress={handleSave}
          disabled={saving || deleting}
          className="bg-[#D97706] rounded-2xl py-4 items-center mt-4"
        >
          {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Save Recipe</Text>}
        </Pressable>
      </ScrollView>
    </ThemedBackground>
  );
}

function FormField(props: { label: string; value: string; onChangeText: (t: string) => void; multiline?: boolean; keyboardType?: 'default' | 'numeric'; placeholder?: string }) {
  return (
    <View className="mb-3">
      <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] mb-1">{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        multiline={props.multiline}
        keyboardType={props.keyboardType}
        placeholder={props.placeholder}
        placeholderTextColor="#B8A48C"
        className="bg-white dark:bg-[#2A211A] rounded-xl px-3 py-2 text-[#3A2A1A] dark:text-[#F5EBDD]"
      />
    </View>
  );
}

function ToggleRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View className="flex-row items-center justify-between bg-white dark:bg-[#2A211A] rounded-xl px-3 py-3 mb-2">
      <Text className="text-[#3A2A1A] dark:text-[#F5EBDD]">{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: '#D97706' }} />
    </View>
  );
}