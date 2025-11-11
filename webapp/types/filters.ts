export interface FilterState {
  translated?: boolean;
  corpus_type?: string;
  world_bank_region?: string;
  publication_year_start?: number;
  publication_year_end?: number;
  similarity_min?: number;
  similarity_max?: number;
  document_id?: string;
  has_predictions?: boolean;
}

export interface FilterParams {
  translated?: boolean;
  corpus_type?: string;
  world_bank_region?: string;
  publication_year_start?: number;
  publication_year_end?: number;
  document_id?: string;
  search?: string;
  has_predictions?: boolean;
}
