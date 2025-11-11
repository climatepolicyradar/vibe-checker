export interface YamlConcept {
  id?: string;
  wikibase_id?: string;
  preferred_label?: string;
  description?: string;
}

export interface ConceptData {
  wikibase_id: string;
  preferred_label?: string;
  description?: string;
  n_classifiers?: number;
}

/** Alias for ConceptData with required fields - used when creating enriched concept objects */
export type EnhancedConcept = Required<ConceptData>;
