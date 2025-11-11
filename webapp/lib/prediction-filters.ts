import { FilterParams } from "@/types/filters";
import { Prediction } from "@/types/predictions";

export function filterPredictions(
  predictions: Prediction[],
  filters: FilterParams
): Prediction[] {
  return predictions.filter((prediction) => {
    const metadata = prediction.metadata;

    // Translation filter
    if (filters.translated !== undefined) {
      const isTranslated = metadata.translated === "True";
      if (isTranslated !== filters.translated) return false;
    }

    // Corpus type filter
    if (
      filters.corpus_type &&
      metadata["document_metadata.corpus_type_name"] !== filters.corpus_type
    ) {
      return false;
    }

    // World Bank region filter
    if (
      filters.world_bank_region &&
      metadata.world_bank_region !== filters.world_bank_region
    ) {
      return false;
    }

    // Publication year filters
    if (filters.publication_year_start || filters.publication_year_end) {
      const pubDate = new Date(metadata["document_metadata.publication_ts"]);
      const pubYear = pubDate.getFullYear();

      if (
        filters.publication_year_start &&
        pubYear < filters.publication_year_start
      ) {
        return false;
      }

      if (
        filters.publication_year_end &&
        pubYear > filters.publication_year_end
      ) {
        return false;
      }
    }

    // Document ID filter
    if (
      filters.document_id &&
      !metadata.document_id
        .toLowerCase()
        .includes(filters.document_id.toLowerCase())
    ) {
      return false;
    }

    // Text search filter with regex support
    if (filters.search) {
      try {
        // Create case-insensitive regex from search terms
        const searchRegex = new RegExp(filters.search.trim(), "i");
        const text = prediction.text;
        if (!searchRegex.test(text)) {
          return false;
        }
      } catch {
        // If regex is invalid, fall back to simple string search
        const searchTerm = filters.search.toLowerCase().trim();
        const text = prediction.text.toLowerCase();
        if (!text.includes(searchTerm)) {
          return false;
        }
      }
    }

    // Has predictions filter
    if (filters.has_predictions !== undefined) {
      const hasPredictions = prediction.spans && prediction.spans.length > 0;
      if (hasPredictions !== filters.has_predictions) {
        return false;
      }
    }

    return true;
  });
}

