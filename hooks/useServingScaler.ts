// hooks/useServingScaler.ts
import { useMemo, useState } from 'react';
import type { Ingredient } from '../types';

/**
 * Scales ingredient quantities proportionally to a chosen serving count.
 * Rounds to sensible precision so "0.333333 cups" doesn't render.
 */
export function useServingScaler(baseServings: number, ingredients: Ingredient[]) {
  const [servings, setServings] = useState(baseServings);

  const scaledIngredients = useMemo(() => {
    const ratio = servings / baseServings;
    return ingredients.map((ing) => ({
      ...ing,
      quantity: roundToNiceFraction(ing.quantity * ratio),
    }));
  }, [ingredients, servings, baseServings]);

  const increment = () => setServings((s) => Math.min(s + 1, 50));
  const decrement = () => setServings((s) => Math.max(s - 1, 1));

  return { servings, setServings, increment, decrement, scaledIngredients };
}

function roundToNiceFraction(value: number): number {
  // Round to nearest 1/4 for small values (cups, tbsp), whole-ish for larger ones
  if (value < 10) {
    return Math.round(value * 4) / 4;
  }
  return Math.round(value * 10) / 10;
}
