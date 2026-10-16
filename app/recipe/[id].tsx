// app/recipe/[id].tsx
import { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Pressable, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTopInset } from '../../hooks/useTopInset';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ArrowLeft, Clock, Users, ChefHat, Heart } from 'lucide-react-native';
import { getRecipeById } from '../../services/recipeService';
import { recordCookedRecipe } from '../../services/cookedRecipeService';
import { useServingScaler } from '../../hooks/useServingScaler';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { CookModeSheet } from '../../components/recipe/CookModeSheet';
import { IngredientRow } from '../../components/recipe/IngredientRow';
import ThemedBackground from '../../components/ThemedBackground';
import { useThemeStore } from '../../store/useThemeStore';
import { ResponsiveText as Text } from '../../components/ResponsiveText';

export default function RecipeDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [cookModeOpen, setCookModeOpen] = useState(false);
  const [showFavoriteConfirmation, setShowFavoriteConfirmation] = useState(false);
  const favoriteConfirmationOpacity = useRef(new Animated.Value(0)).current;
  const favoriteHeartSplash = useRef(new Animated.Value(0)).current;
  const favoriteConfirmationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topInset = useTopInset();
  const isDark = useThemeStore((s) => s.isDark);
  const iconMain = isDark ? '#F5EBDD' : '#3A2A1A';
  const iconMuted = isDark ? '#B8A48C' : '#8A6D4E';

  const { data: recipe, isLoading } = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => getRecipeById(id),
    enabled: !!id,
  });

  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const isFavorite = useFavoritesStore((s) => (recipe ? s.isFavorite(recipe.id) : false));

  useEffect(() => {
    return () => {
      if (favoriteConfirmationTimer.current) {
        clearTimeout(favoriteConfirmationTimer.current);
      }
    };
  }, []);

  const addToFavorites = () => {
    if (!recipe) return;

    if (isFavorite) {
      toggleFavorite(recipe.id);
      return;
    }

    toggleFavorite(recipe.id);
    if (favoriteConfirmationTimer.current) {
      clearTimeout(favoriteConfirmationTimer.current);
    }
    favoriteConfirmationOpacity.stopAnimation();
    favoriteHeartSplash.stopAnimation();
    setShowFavoriteConfirmation(true);
    favoriteConfirmationOpacity.setValue(0);
    favoriteHeartSplash.setValue(0);
    Animated.parallel([
      Animated.timing(favoriteConfirmationOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(favoriteHeartSplash, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(favoriteHeartSplash, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    favoriteConfirmationTimer.current = setTimeout(() => {
      Animated.timing(favoriteConfirmationOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setShowFavoriteConfirmation(false);
      });
    }, 1600);
  };

  const { servings, increment, decrement, scaledIngredients } = useServingScaler(
    recipe?.baseServings ?? 4,
    recipe?.ingredients ?? []
  );

  if (isLoading || !recipe) {
    return (
      <ThemedBackground>
        <View className="flex-1 items-center justify-center">
          <Text className="text-[#8A6D4E] dark:text-[#B8A48C]">Loading...</Text>
        </View>
      </ThemedBackground>
    );
  }

  return (
    <ThemedBackground>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="relative">
          <Image
            source={typeof recipe.heroImageUrl === 'string' ? { uri: recipe.heroImageUrl } : recipe.heroImageUrl}
            style={{ width: '100%', height: 280 }}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            style={{ top: topInset + 8 }}
            className="absolute left-4 bg-white/90 dark:bg-[#2A211A]/90 rounded-full p-3"
          >
            <ArrowLeft size={22} color={iconMain} />
          </Pressable>
          <Pressable
            onPress={addToFavorites}
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            style={{ top: topInset + 8 }}
            className="absolute right-4 bg-white/90 dark:bg-[#2A211A]/90 rounded-full p-3"
          >
            <Heart
              size={22}
              color={isFavorite ? '#D97706' : iconMain}
              fill={isFavorite ? '#D97706' : 'transparent'}
            />
          </Pressable>
          {showFavoriteConfirmation && (
            <Animated.View
              pointerEvents="none"
              style={{ top: topInset + 68, opacity: favoriteConfirmationOpacity }}
              className="absolute right-4 flex-row items-center gap-2 rounded-full bg-[#D97706] px-4 py-2"
            >
              <View className="h-6 w-6 items-center justify-center">
                {[[-12, -12], [12, -12], [-12, 12], [12, 12]].map(([x, y], index) => (
                  <Animated.View
                    key={index}
                    style={{
                      position: 'absolute',
                      opacity: favoriteHeartSplash.interpolate({
                        inputRange: [0, 0.2, 1],
                        outputRange: [0, 1, 0],
                      }),
                      transform: [
                        {
                          translateX: favoriteHeartSplash.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, x * 1.8],
                          }),
                        },
                        {
                          translateY: favoriteHeartSplash.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, y * 1.8],
                          }),
                        },
                        {
                          scale: favoriteHeartSplash.interpolate({
                            inputRange: [0, 0.2, 1],
                            outputRange: [0.2, 1, 0.5],
                          }),
                        },
                      ],
                    }}
                  >
                    <Heart size={12} color="#FFF1F2" fill="#FFF1F2" />
                  </Animated.View>
                ))}
                <Animated.View
                  style={{
                    transform: [
                      {
                        scale: favoriteHeartSplash.interpolate({
                          inputRange: [0, 0.35, 0.7, 1],
                          outputRange: [0.6, 1.5, 0.9, 1],
                        }),
                      },
                    ],
                  }}
                >
                  <Heart size={20} color="#FFF1F2" fill="#FFF1F2" />
                </Animated.View>
              </View>
              <Text className="text-white font-semibold">Added to Favorites</Text>
            </Animated.View>
          )}
        </View>

        <View className="px-4 pt-4">
          <Text className="text-2xl font-bold text-[#3A2A1A] dark:text-[#F5EBDD]">{recipe.title}</Text>
          <Text className="text-sm text-[#8A6D4E] dark:text-[#B8A48C] mt-1">{recipe.description}</Text>

          <View className="flex-row justify-between mt-4 bg-white/75 dark:bg-[#2A211A]/80 border border-white/60 dark:border-[#3D2F22] rounded-2xl p-4">
            <MetaStat icon={<Clock size={18} color="#D97706" />} label="Prep" value={`${recipe.prepTimeMinutes}m`} />
            <MetaStat icon={<Clock size={18} color="#D97706" />} label="Cook" value={`${recipe.cookTimeMinutes}m`} />
            <MetaStat icon={<ChefHat size={18} color="#D97706" />} label="Level" value={recipe.difficulty} />
          </View>

          <View className="flex-row items-center justify-between mt-6">
            <Text className="text-lg font-semibold text-[#3A2A1A] dark:text-[#F5EBDD]">Ingredients</Text>
            <View className="flex-row items-center gap-3">
              <Pressable onPress={decrement} className="bg-white/75 dark:bg-[#2A211A]/80 border border-white/60 dark:border-[#3D2F22] w-8 h-8 rounded-full items-center justify-center">
                <Text className="text-lg text-[#3A2A1A] dark:text-[#F5EBDD]">–</Text>
              </Pressable>
              <View className="flex-row items-center gap-1">
                <Users size={16} color={iconMuted} />
                <Text className="text-[#3A2A1A] dark:text-[#F5EBDD] font-medium">{servings}</Text>
              </View>
              <Pressable onPress={increment} className="bg-white/75 dark:bg-[#2A211A]/80 border border-white/60 dark:border-[#3D2F22] w-8 h-8 rounded-full items-center justify-center">
                <Text className="text-lg text-[#3A2A1A] dark:text-[#F5EBDD]">+</Text>
              </Pressable>
            </View>
          </View>

          <View className="mt-2">
            {scaledIngredients.map((ing) => (
              <IngredientRow key={ing.id} ingredient={ing} />
            ))}
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-[#FFF8F0]/90 dark:bg-[#161502]/90">
        <Pressable
          onPress={() => setCookModeOpen(true)}
          className="bg-[#D97706] rounded-2xl py-4 items-center"
        >
          <Text className="text-white font-semibold text-base">Start Cook Mode</Text>
        </Pressable>
      </View>

      {cookModeOpen && (
        <CookModeSheet
          steps={recipe.steps}
          onClose={() => setCookModeOpen(false)}
          onComplete={recordCookedRecipe}
        />
      )}
    </ThemedBackground>
  );
}

function MetaStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View className="items-center">
      {icon}
      <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] mt-1">{label}</Text>
      <Text className="text-sm font-semibold text-[#3A2A1A] dark:text-[#F5EBDD]">{value}</Text>
    </View>
  );
}