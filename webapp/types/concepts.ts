export interface YamlConcept {
  id?: string;
  wikibase_id?: string;
  preferred_label?: string;
  description?: string;
}

export interface EnhancedConcept {
  wikibase_id: string;
  preferred_label: string;
  description: string;
  n_classifiers: number;
}

export interface ConceptData {
  wikibase_id: string;
  preferred_label?: string;
  description?: string;
  n_classifiers?: number;
}
