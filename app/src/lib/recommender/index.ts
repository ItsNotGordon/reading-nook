export {
  BOOK_WEIGHT_LIKED,
  BOOK_WEIGHT_OKAY,
  GENRE_AFFINITY_DISLIKED,
  GENRE_AFFINITY_LIKED,
  GENRE_AFFINITY_OKAY,
  authorKey,
  buildWeightedTasteProfile,
  genreKey,
  topGenresByAffinity,
  type FinishedBookRow,
  type WeightedBasket,
  type WeightedTasteProfile,
} from "./weightedTaste";

export {
  DEFAULT_MIN_RULE_CONFIDENCE,
  DEFAULT_MIN_RULE_LIFT,
  DEFAULT_MIN_SUPPORT_WEIGHT,
  mineWeightedApriori,
  recommendTargetGenres,
  runWeightedApriori,
  type AssociationRule,
  type TargetGenreResult,
  type WeightedAprioriResult,
} from "./weightedApriori";

export {
  DEFAULT_K,
  knnReasonFragment,
  predictLikeScore,
  type KnnCandidate,
  type KnnPrediction,
} from "./sentimentKnn";

export {
  HYBRID_SOURCE,
  getWeightedTopGenres,
  hybridAprioriKnnRecommend,
  type HybridRecommendOptions,
  type HybridScoredRow,
} from "./hybridAprioriKnn";

export {
  TFIDF_SOURCE,
  tfidfRecommend,
  type TfidfRecommendOptions,
} from "./tfidfRecommend";

export {
  DEFAULT_POPULARITY_SCORE,
  buildPopularityScoreMap,
  popularityBottomThreshold,
  rawPopularityWeight,
  type PopularityCandidate,
} from "./popularityScore";
