import { ConceptData, EnhancedConcept, YamlConcept } from "@/types/concepts";

export function getConceptDefaults(
  concept: string | YamlConcept,
  conceptId: string,
): Omit<EnhancedConcept, "n_classifiers"> {
  return {
    wikibase_id: conceptId,
    preferred_label:
      typeof concept === "string"
        ? concept
        : concept.preferred_label || conceptId,
    description:
      typeof concept === "string"
        ? `Concept ${concept}`
        : concept.description || `Concept ${conceptId}`,
  };
}

/**
 * Enriches concept data with default values for missing fields.
 * Ensures all concepts have required fields with sensible defaults.
 */
export function enrichConceptData(concept: ConceptData): EnhancedConcept {
  return {
    wikibase_id: concept.wikibase_id,
    preferred_label: concept.preferred_label || concept.wikibase_id,
    description: concept.description || `Concept ${concept.wikibase_id}`,
    n_classifiers: concept.n_classifiers || 0,
  };
}
