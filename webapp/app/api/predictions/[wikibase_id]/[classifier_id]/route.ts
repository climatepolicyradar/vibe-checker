import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { NextResponse } from "next/server";
import { fromIni } from "@aws-sdk/credential-providers";
import cache from "@/lib/cache";

interface FilterParams {
  translated?: boolean;
  corpus_type?: string;
  world_bank_region?: string;
  publication_year_start?: number;
  publication_year_end?: number;
  document_id?: string;
  search?: string;
  has_predictions?: boolean;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ wikibase_id: string; classifier_id: string }> },
) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = 50; // Fixed page size

    // Parse filter parameters
    const filters: FilterParams = {
      translated: searchParams.get("translated")
        ? searchParams.get("translated") === "true"
        : undefined,
      corpus_type: searchParams.get("corpus_type") || undefined,
      world_bank_region: searchParams.get("world_bank_region") || undefined,
      publication_year_start: searchParams.get("publication_year_start")
        ? parseInt(searchParams.get("publication_year_start")!)
        : undefined,
      publication_year_end: searchParams.get("publication_year_end")
        ? parseInt(searchParams.get("publication_year_end")!)
        : undefined,
      document_id: searchParams.get("document_id") || undefined,
      search: searchParams.get("search") || undefined,
      has_predictions: searchParams.get("has_predictions")
        ? searchParams.get("has_predictions") === "true"
        : undefined,
    };

    // Validate pagination parameters
    if (page < 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid pagination parameters. Page must be >= 1",
        },
        { status: 400 },
      );
    }

    const { wikibase_id, classifier_id } = await params;
    const key = `${wikibase_id}/${classifier_id}/predictions.jsonl`;

    // Check cache first
    const cacheKey = `predictions-${wikibase_id}-${classifier_id}`;
    let allPredictions = cache.get(cacheKey);

    if (!allPredictions) {
      console.log(`Cache miss for predictions: ${key}, fetching from S3...`);

      const s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: fromIni({
          profile: process.env.AWS_PROFILE,
        }),
      });

      const bucket = process.env.BUCKET_NAME;
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const response = await s3Client.send(command);
      const body = response.Body;

      if (!body) {
        throw new Error("No body in S3 response");
      }

      const text = await body.transformToString();

      // Parse JSONL data
      const lines = text.split("\n").filter((line) => line.trim() !== "");
      allPredictions = lines.map((line) => JSON.parse(line));

      // Store in cache
      cache.set(cacheKey, allPredictions);
      console.log(`Predictions data cached successfully for: ${key}`);
    } else {
      console.log(`Cache hit for predictions: ${key}`);
    }

    // Store total unfiltered count
    const totalUnfiltered = allPredictions.length;

    // Apply filters
    const filteredPredictions = allPredictions.filter((prediction) => {
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
        } catch (error) {
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

    // Apply pagination to filtered results
    const totalFiltered = filteredPredictions.length;
    const totalPages = Math.ceil(totalFiltered / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedPassages = filteredPredictions.slice(startIndex, endIndex);

    // Extract unique values for filter options
    const uniqueCorpusTypes = [
      ...new Set(
        allPredictions.map(
          (p) => p.metadata["document_metadata.corpus_type_name"],
        ),
      ),
    ].sort();
    const uniqueRegions = [
      ...new Set(allPredictions.map((p) => p.metadata.world_bank_region)),
    ].sort();

    return NextResponse.json({
      success: true,
      data: paginatedPassages,
      s3Uri: `s3://${process.env.BUCKET_NAME}/${key}`,
      pagination: {
        page,
        pageSize,
        totalFiltered,
        totalUnfiltered,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filters: {
        availableCorpusTypes: uniqueCorpusTypes,
        availableRegions: uniqueRegions,
        applied: filters,
      },
    });
  } catch (error) {
    console.error("Error fetching predictions from S3:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
