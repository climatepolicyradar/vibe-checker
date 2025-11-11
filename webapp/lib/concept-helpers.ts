import { YamlConcept, EnhancedConcept } from "@/types/concepts";

export function getConceptDefaults(
  concept: string | YamlConcept,
  conceptId: string
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

