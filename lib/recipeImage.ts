// lib/recipeImage.ts
//
// Resolves a Recipe's heroImageUrl into something <Image> (expo-image) can
// render, or null when there's no usable image yet (e.g. a seeded recipe
// whose photo hasn't been re-added via Edit Recipe).
//
// heroImageUrl can be:
//   - a real hosted URL string (any https image link) -> wrap as { uri }
//   - a local require()'d asset number      -> pass through as-is
//   - an empty string ''                    -> treat as "no image"
//   - undefined/null                        -> treat as "no image"
export function resolveRecipeImageSource(heroImageUrl: string | number | undefined | null) {
  if (typeof heroImageUrl === 'number') return heroImageUrl;
  if (typeof heroImageUrl === 'string' && heroImageUrl.trim().length > 0) {
    return { uri: heroImageUrl };
  }
  return null;
}