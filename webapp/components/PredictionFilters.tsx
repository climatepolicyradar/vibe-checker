"use client";

import { useEffect, useState } from "react";

export interface FilterState {
  translated?: boolean;
  corpus_type?: string;
  world_bank_region?: string;
  publication_year_start?: number;
  publication_year_end?: number;
  similarity_min?: number;
  similarity_max?: number;
  document_id?: string;
}

interface PredictionFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  availableCorpusTypes: string[];
  availableRegions: string[];
}

export default function PredictionFilters({
  onFilterChange,
  availableCorpusTypes,
  availableRegions,
}: PredictionFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({});
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const updateFilter = (
    key: keyof FilterState,
    value: string | number | boolean | undefined,
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "" || value === undefined ? undefined : value,
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const activeFilterCount = Object.keys(filters).filter(
    (key) => filters[key as keyof FilterState] !== undefined,
  ).length;

  return (
    <div className="card mb-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-secondary transition-colors hover:text-primary"
          >
            <svg
              className={`h-4 w-4 transition-transform ${
                isExpanded ? "rotate-90" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            Filters
          </button>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-accent-primary px-2 py-1 text-xs font-medium text-white">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-sm text-secondary transition-colors hover:text-primary"
          >
            Clear all
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {/* Translation Status */}
          <div>
            <label className="mb-2 block text-sm font-medium text-secondary">
              Translation Status
            </label>
            <select
              value={
                filters.translated === undefined
                  ? ""
                  : filters.translated.toString()
              }
              onChange={(e) =>
                updateFilter(
                  "translated",
                  e.target.value === "" ? undefined : e.target.value === "true",
                )
              }
              className="input w-full text-sm"
            >
              <option value="">All</option>
              <option value="true">Translated</option>
              <option value="false">Original</option>
            </select>
          </div>

          {/* Corpus Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-secondary">
              Corpus Type
            </label>
            <select
              value={filters.corpus_type || ""}
              onChange={(e) => updateFilter("corpus_type", e.target.value)}
              className="input w-full text-sm"
            >
              <option value="">All types</option>
              {availableCorpusTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* World Bank Region */}
          <div>
            <label className="mb-2 block text-sm font-medium text-secondary">
              Region
            </label>
            <select
              value={filters.world_bank_region || ""}
              onChange={(e) =>
                updateFilter("world_bank_region", e.target.value)
              }
              className="input w-full text-sm"
            >
              <option value="">All regions</option>
              {availableRegions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>

          {/* Publication Year Range */}
          <div>
            <label className="mb-2 block text-sm font-medium text-secondary">
              Publication Year (From)
            </label>
            <input
              type="number"
              min="1990"
              max="2030"
              value={filters.publication_year_start || ""}
              onChange={(e) =>
                updateFilter(
                  "publication_year_start",
                  e.target.value ? parseInt(e.target.value) : undefined,
                )
              }
              className="input w-full text-sm"
              placeholder="e.g. 2020"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-secondary">
              Publication Year (To)
            </label>
            <input
              type="number"
              min="1990"
              max="2030"
              value={filters.publication_year_end || ""}
              onChange={(e) =>
                updateFilter(
                  "publication_year_end",
                  e.target.value ? parseInt(e.target.value) : undefined,
                )
              }
              className="input w-full text-sm"
              placeholder="e.g. 2024"
            />
          </div>

          {/* Document ID Search */}
          <div className="lg:col-span-2 xl:col-span-1">
            <label className="mb-2 block text-sm font-medium text-secondary">
              Document ID
            </label>
            <input
              type="text"
              value={filters.document_id || ""}
              onChange={(e) => updateFilter("document_id", e.target.value)}
              className="input w-full text-sm"
              placeholder="e.g. CCLW.executive.10310.4923"
            />
          </div>
        </div>
      )}
    </div>
  );
}
