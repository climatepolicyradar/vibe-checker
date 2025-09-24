"use client";

import { useEffect, useState } from "react";
import { Slider } from "@base-ui-components/react/slider";
import { Select } from "@base-ui-components/react/select";

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
  totalFiltered?: number;
  totalUnfiltered?: number;
}

export default function PredictionFilters({
  onFilterChange,
  availableCorpusTypes,
  availableRegions,
  totalFiltered = 0,
  totalUnfiltered = 0,
}: PredictionFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({});
  const [isExpanded, setIsExpanded] = useState(false);

  // Debounce filter changes to prevent rapid API calls during slider drag
  useEffect(() => {
    const timeout = setTimeout(() => {
      onFilterChange(filters);
    }, 300);

    return () => clearTimeout(timeout);
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
    <div>
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
          {activeFilterCount > 0 && totalUnfiltered > 0 && (
            <div className="flex items-center gap-2 text-xs text-secondary">
              <div className="h-1.5 w-24 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-text-primary rounded-full transition-all duration-300"
                  style={{ width: `${(totalFiltered / totalUnfiltered) * 100}%` }}
                />
              </div>
              <span className="font-mono">
                {totalFiltered} / {totalUnfiltered}
              </span>
            </div>
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
            <Select.Root
              items={[
                { value: "", label: "All" },
                { value: "true", label: "Translated" },
                { value: "false", label: "Original" },
              ]}
              value={filters.translated === undefined ? "" : filters.translated.toString()}
              onValueChange={(value) => {
                updateFilter(
                  "translated",
                  value === "" ? undefined : value === "true",
                );
              }}
            >
              <Select.Trigger className="input w-full text-sm flex items-center justify-between">
                <Select.Value />
                <Select.Icon>
                  <svg
                    className="h-4 w-4 text-secondary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner>
                  <Select.Popup className="z-50 min-w-[8rem] overflow-hidden rounded-md border border-border-primary bg-bg-primary shadow-lg">
                    <Select.Item
                      value=""
                      className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-interactive-hover focus:bg-interactive-hover"
                    >
                      <Select.ItemText>All</Select.ItemText>
                    </Select.Item>
                    <Select.Item
                      value="true"
                      className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-interactive-hover focus:bg-interactive-hover"
                    >
                      <Select.ItemText>Translated</Select.ItemText>
                    </Select.Item>
                    <Select.Item
                      value="false"
                      className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-interactive-hover focus:bg-interactive-hover"
                    >
                      <Select.ItemText>Original</Select.ItemText>
                    </Select.Item>
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </div>

          {/* Corpus Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-secondary">
              Corpus Type
            </label>
            <Select.Root
              items={[
                { value: "", label: "All types" },
                ...availableCorpusTypes.map((type) => ({
                  value: type,
                  label: type,
                })),
              ]}
              value={filters.corpus_type || ""}
              onValueChange={(value) => updateFilter("corpus_type", value)}
            >
              <Select.Trigger className="input w-full text-sm flex items-center justify-between">
                <Select.Value />
                <Select.Icon>
                  <svg
                    className="h-4 w-4 text-secondary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner>
                  <Select.Popup className="z-50 min-w-[8rem] overflow-hidden rounded-md border border-border-primary bg-bg-primary shadow-lg">
                    <Select.Item
                      value=""
                      className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-interactive-hover focus:bg-interactive-hover"
                    >
                      <Select.ItemText>All types</Select.ItemText>
                    </Select.Item>
                    {availableCorpusTypes.map((type) => (
                      <Select.Item
                        key={type}
                        value={type}
                        className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-interactive-hover focus:bg-interactive-hover"
                      >
                        <Select.ItemText>{type}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </div>

          {/* World Bank Region */}
          <div>
            <label className="mb-2 block text-sm font-medium text-secondary">
              Region
            </label>
            <Select.Root
              items={[
                { value: "", label: "All regions" },
                ...availableRegions.map((region) => ({
                  value: region,
                  label: region,
                })),
              ]}
              value={filters.world_bank_region || ""}
              onValueChange={(value) => updateFilter("world_bank_region", value)}
            >
              <Select.Trigger className="input w-full text-sm flex items-center justify-between">
                <Select.Value />
                <Select.Icon>
                  <svg
                    className="h-4 w-4 text-secondary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner>
                  <Select.Popup className="z-50 min-w-[8rem] overflow-hidden rounded-md border border-border-primary bg-bg-primary shadow-lg">
                    <Select.Item
                      value=""
                      className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-interactive-hover focus:bg-interactive-hover"
                    >
                      <Select.ItemText>All regions</Select.ItemText>
                    </Select.Item>
                    {availableRegions.map((region) => (
                      <Select.Item
                        key={region}
                        value={region}
                        className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-interactive-hover focus:bg-interactive-hover"
                      >
                        <Select.ItemText>{region}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </div>

          {/* Publication Year Range */}
          <div>
            <label className="mb-2 block text-sm font-medium text-secondary">
              Publication Year Range
            </label>
            <div className="px-2">
              <Slider.Root
                min={1990}
                max={2030}
                value={[
                  filters.publication_year_start || 1990,
                  filters.publication_year_end || 2030,
                ]}
                onValueChange={(value: number[]) => {
                  updateFilter("publication_year_start", value[0] === 1990 ? undefined : value[0]);
                  updateFilter("publication_year_end", value[1] === 2030 ? undefined : value[1]);
                }}
                className="relative flex w-full touch-none select-none items-center"
              >
                <Slider.Control className="relative flex h-5 w-full cursor-pointer items-center">
                  <Slider.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-bg-tertiary">
                    <Slider.Indicator className="absolute h-full bg-text-primary" />
                  </Slider.Track>
                  <Slider.Thumb
                    index={0}
                    className="block h-5 w-5 rounded-full border-2 border-text-primary bg-bg-primary shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                  />
                  <Slider.Thumb
                    index={1}
                    className="block h-5 w-5 rounded-full border-2 border-text-primary bg-bg-primary shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                  />
                </Slider.Control>
              </Slider.Root>
              <div className="mt-2 flex justify-between text-xs text-secondary">
                <span>{filters.publication_year_start || 1990}</span>
                <span>{filters.publication_year_end || 2030}</span>
              </div>
            </div>
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
