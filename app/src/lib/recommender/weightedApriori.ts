import {
  topGenresByAffinity,
  type WeightedBasket,
  type WeightedTasteProfile,
} from "./weightedTaste";

export const DEFAULT_MIN_RULE_CONFIDENCE = 0.5;
export const DEFAULT_MIN_RULE_LIFT = 1;
/** Minimum summed book weight for an itemset to count as frequent. */
export const DEFAULT_MIN_SUPPORT_WEIGHT = 1;

export type AssociationRule = {
  antecedent: string[];
  consequent: string[];
  support: number;
  confidence: number;
  lift: number;
};

export type WeightedAprioriResult = {
  rules: AssociationRule[];
  frequentPairs: Map<string, number>;
  frequentSingles: Map<string, number>;
};

function basketContains(basket: WeightedBasket, itemset: string[]): boolean {
  const set = new Set(basket.genres);
  return itemset.every((g) => set.has(g));
}

function weightedSupport(
  baskets: WeightedBasket[],
  itemset: string[],
): number {
  let sum = 0;
  for (const b of baskets) {
    if (basketContains(b, itemset)) sum += b.bookWeight;
  }
  return sum;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}\0${b}` : `${b}\0${a}`;
}

function parsePairKey(key: string): [string, string] {
  const [a, b] = key.split("\0");
  return [a, b];
}

/**
 * Mine weighted 1- and 2-itemsets and association rules from positive (liked/okay) baskets.
 */
export function mineWeightedApriori(
  baskets: WeightedBasket[],
  options: {
    minSupportWeight?: number;
    minConfidence?: number;
    minLift?: number;
  } = {},
): WeightedAprioriResult {
  const minSupport = options.minSupportWeight ?? DEFAULT_MIN_SUPPORT_WEIGHT;
  const minConfidence = options.minConfidence ?? DEFAULT_MIN_RULE_CONFIDENCE;
  const minLift = options.minLift ?? DEFAULT_MIN_RULE_LIFT;

  const genreSet = new Set<string>();
  for (const b of baskets) {
    for (const g of b.genres) genreSet.add(g);
  }

  const frequentSingles = new Map<string, number>();
  for (const g of genreSet) {
    const sup = weightedSupport(baskets, [g]);
    if (sup >= minSupport) frequentSingles.set(g, sup);
  }

  const frequentPairs = new Map<string, number>();
  const singles = [...frequentSingles.keys()];
  for (let i = 0; i < singles.length; i += 1) {
    for (let j = i + 1; j < singles.length; j += 1) {
      const a = singles[i];
      const b = singles[j];
      const sup = weightedSupport(baskets, [a, b]);
      if (sup >= minSupport) frequentPairs.set(pairKey(a, b), sup);
    }
  }

  const totalWeight = baskets.reduce((s, b) => s + b.bookWeight, 0) || 1;
  const rules: AssociationRule[] = [];

  for (const [g, supA] of frequentSingles) {
    for (const [other, supPair] of frequentPairs) {
      const [x, y] = parsePairKey(other);
      if (x !== g && y !== g) continue;
      const consequent = x === g ? y : x;
      const confidence = supPair / supA;
      const supConsequent = frequentSingles.get(consequent) ?? 0;
      const supportConsequentNorm = supConsequent / totalWeight;
      const lift =
        supportConsequentNorm > 0 ? confidence / supportConsequentNorm : 0;
      if (confidence >= minConfidence && lift >= minLift) {
        rules.push({
          antecedent: [g],
          consequent: [consequent],
          support: supPair,
          confidence,
          lift,
        });
      }
    }
  }

  rules.sort((a, b) => {
    if (b.lift !== a.lift) return b.lift - a.lift;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return a.consequent[0].localeCompare(b.consequent[0]);
  });

  return { rules, frequentPairs, frequentSingles };
}

export type TargetGenreResult = {
  targetGenres: Set<string>;
  matchedRules: AssociationRule[];
  /** Human-readable fragments for reason strings. */
  ruleBlurbs: string[];
};

/**
 * Genres to expand candidates: rule consequents + top affinity genres.
 */
export function recommendTargetGenres(
  profile: WeightedTasteProfile,
  apriori: WeightedAprioriResult,
  options: { topAffinityCount?: number } = {},
): TargetGenreResult {
  const topAffinityCount = options.topAffinityCount ?? 5;
  const topGenres = new Set(topGenresByAffinity(profile, topAffinityCount));
  const targetGenres = new Set<string>(topGenres);
  const matchedRules: AssociationRule[] = [];
  const ruleBlurbs: string[] = [];

  const positiveAffinity = (g: string) => (profile.genreAffinity.get(g) ?? 0) > 0;

  for (const rule of apriori.rules) {
    const antecedentOk = rule.antecedent.every(positiveAffinity);
    const overlapsTop = rule.antecedent.some((g) => topGenres.has(g));
    if (!antecedentOk || !overlapsTop) continue;
    matchedRules.push(rule);
    for (const c of rule.consequent) {
      if (positiveAffinity(c)) targetGenres.add(c);
    }
    for (const c of rule.consequent) {
      const displayName = c.charAt(0).toUpperCase() + c.slice(1);
      if (!ruleBlurbs.includes(displayName)) ruleBlurbs.push(displayName);
    }
    for (const a of rule.antecedent) {
      const displayName = a.charAt(0).toUpperCase() + a.slice(1);
      if (!ruleBlurbs.includes(displayName)) ruleBlurbs.push(displayName);
    }
  }

  return { targetGenres, matchedRules, ruleBlurbs };
}

export function runWeightedApriori(profile: WeightedTasteProfile): TargetGenreResult {
  if (profile.positiveBaskets.length < 2) {
    const fallback = topGenresByAffinity(profile, 6);
    return {
      targetGenres: new Set(fallback),
      matchedRules: [],
      ruleBlurbs: [],
    };
  }

  const apriori = mineWeightedApriori(profile.positiveBaskets);
  return recommendTargetGenres(profile, apriori);
}
