import io
import json
import logging
import os
import random
from datetime import datetime
from pathlib import Path
from typing import Optional

import boto3
import numpy as np
import pandas as pd
import typer
import yaml
from knowledge_graph.classifier import ClassifierFactory
from knowledge_graph.identifiers import WikibaseID
from knowledge_graph.labelled_passage import LabelledPassage
from knowledge_graph.wikibase import WikibaseSession
from mypy_boto3_s3 import S3Client
from prefect import flow, task
from prefect.artifacts import create_progress_artifact, update_progress_artifact
from prefect.futures import wait
from prefect.logging import get_logger
from prefect.task_runners import ThreadPoolTaskRunner
from rich.logging import RichHandler
from sentence_transformers import SentenceTransformer

# Get bucket name with validation
if not (BUCKET_NAME := os.getenv("BUCKET_NAME", "")):
    raise ValueError(
        "BUCKET_NAME must be set.\n"
        "For local dev: export BUCKET_NAME=$(pulumi stack output bucket_name)"
    )

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    handlers=[RichHandler(markup=True, rich_tracebacks=True)],
)
logger = get_logger(__name__)


def get_s3_client() -> S3Client:
    """Get a configured S3 client."""
    session = boto3.Session(
        # For local development, you'll need to set the AWS_REGION / AWS_PROFILE env vars
        # When the flow is running in AWS, the getenv values default to None, and boto3
        # will auto-detect:
        # - Region from EC2 metadata or AWS_DEFAULT_REGION
        # - Credentials from IAM role or ~/.aws/credentials
        region_name=os.getenv("AWS_REGION"),
        profile_name=os.getenv("AWS_PROFILE"),
    )
    return session.client("s3")


def get_object_bytes_from_s3(s3_client: S3Client, key: str) -> bytes:
    """Load bytes from S3 object."""
    return s3_client.get_object(Bucket=BUCKET_NAME, Key=key)["Body"].read()


def push_object_bytes_to_s3(s3_client: S3Client, key: str | Path, data: bytes) -> None:
    """Push bytes to S3 object."""
    s3_client.put_object(Bucket=BUCKET_NAME, Key=str(key), Body=data)


@task(retries=3, retry_delay_seconds=5)
def load_passages_dataset(
    passages_dataset_file_name: str = "passages_dataset.feather",
) -> pd.DataFrame:
    """Load the passages dataset from S3."""
    s3_client = get_s3_client()
    bytes_from_s3 = get_object_bytes_from_s3(s3_client, passages_dataset_file_name)
    try:
        dataset = pd.read_feather(io.BytesIO(bytes_from_s3))
        if dataset.empty:
            raise ValueError("The dataset is empty")
    except Exception as e:
        raise ValueError("Failed to load dataset") from e

    # keep only the useful columns
    dataset = dataset[
        [
            "text_block.text",
            "text_block.text_block_id",
            # "text_block.language",
            # "text_block.type",
            # "text_block.type_confidence",
            "text_block.page_number",
            # "text_block.coords",
            "document_id",
            # "document_name",
            # "document_source_url",
            # "document_content_type",
            # "document_md5_sum",
            # "languages",
            "translated",
            # "has_valid_text",
            # "pipeline_metadata",
            # "document_metadata.name",
            # "document_metadata.document_title",
            # "document_metadata.description",
            # "document_metadata.import_id",
            "document_metadata.slug",
            # "document_metadata.family_import_id",
            "document_metadata.family_slug",
            "document_metadata.publication_ts",
            # "document_metadata.date",
            # "document_metadata.source_url",
            # "document_metadata.download_url",
            # "document_metadata.corpus_import_id",
            "document_metadata.corpus_type_name",
            # "document_metadata.collection_title",
            # "document_metadata.collection_summary",
            # "document_metadata.type",
            # "document_metadata.source",
            # "document_metadata.category",
            # "document_metadata.geography",
            # "document_metadata.geographies",
            # "document_metadata.languages",
            # "document_metadata.metadata",
            # "document_description",
            # "document_cdn_object",
            # "document_slug",
            # "pdf_data.md5sum",
            # "pdf_data_page_metadata.dimensions",
            # "pdf_data_page_metadata.page_number",
            # "_html_data.detected_title",
            # "_html_data.detected_date",
            # "_html_data.has_valid_text",
            # "pipeline_metadata.parser_metadata",
            # "text_block.index",
            "world_bank_region",
        ]
    ]
    assert isinstance(dataset, pd.DataFrame)
    return dataset


@task(retries=3, retry_delay_seconds=5)
def load_wikibase_ids_from_s3(
    config_file_name: str = "concepts.yml",
) -> list[WikibaseID]:
    """Load concept IDs from the configuration file."""
    s3_client = get_s3_client()
    bytes_from_s3 = get_object_bytes_from_s3(s3_client, config_file_name)
    try:
        config = yaml.safe_load(bytes_from_s3)
        wikibase_ids = sorted([WikibaseID(id) for id in config])
    except yaml.YAMLError as e:
        raise ValueError(
            "The config file should be valid YAML containing a list of Wikibase IDs"
        ) from e

    if not wikibase_ids:
        raise ValueError("No concepts found in the config")

    return wikibase_ids


@task(retries=3, retry_delay_seconds=5)
def load_embeddings(
    embeddings_file_name: str = "passages_embeddings.npy",
) -> np.ndarray:
    """Load the passages embeddings from S3."""
    s3_client = get_s3_client()
    bytes_from_s3 = get_object_bytes_from_s3(s3_client, embeddings_file_name)
    return np.load(io.BytesIO(bytes_from_s3))


@task(retries=3, retry_delay_seconds=5)
def load_embeddings_metadata(
    embeddings_metadata_file_name: str = "passages_embeddings_metadata.json",
) -> dict:
    """Load the passages embeddings metadata from S3."""
    s3_client = get_s3_client()
    bytes_from_s3 = get_object_bytes_from_s3(s3_client, embeddings_metadata_file_name)
    return json.load(io.BytesIO(bytes_from_s3))


@task(retries=2, retry_delay_seconds=10)
def process_single_concept(
    wikibase_id: WikibaseID,
    passages_dataset: pd.DataFrame,
    passages_embeddings: np.ndarray,
    embedding_model: SentenceTransformer,
) -> dict:
    """
    Process inference for a single concept.

    This task is designed to be isolated - if it fails, it won't affect the other
    concept processing tasks.
    """
    s3_client = get_s3_client()
    try:
        # Create progress artifact for this concept
        progress_id = create_progress_artifact(
            progress=0.0,
            key=f"concept-{wikibase_id}".lower(),
            description=f"Processing concept {wikibase_id}",
        )

        wikibase = WikibaseSession()
        concept = wikibase.get_concept(wikibase_id)
        logger.info(f"Loaded concept: {concept}")

        concept_embedding = embedding_model.encode(concept.to_markdown())

        # Batch compute similarities using pre-computed embeddings
        passages = passages_dataset["text_block.text"].tolist()
        logger.info(f"Computing similarities for {len(passages)} passages...")

        # Ensure embeddings and concept embedding have compatible dimensions
        if len(passages_embeddings) != len(passages_dataset):
            raise ValueError(
                f"Mismatch between embeddings ({len(passages_embeddings)}) "
                f"and dataset ({len(passages_dataset)}) lengths"
            )

        similarities = passages_embeddings @ concept_embedding  # Shape: (n_passages,)

        similarity_threshold = 0.65
        min_passages = 10_000
        max_passages = 100_000

        # Create a copy of the dataset to avoid modifying the shared DataFrame
        passages_with_similarity = passages_dataset.copy()
        passages_with_similarity["similarity"] = similarities

        # Sort by similarity (highest first)
        passages_with_similarity = passages_with_similarity.sort_values(
            "similarity", ascending=False
        )

        # Separate the passages which are above and below the threshold similarity to
        # our concept embedding.
        above_threshold = passages_with_similarity[
            passages_with_similarity["similarity"] > similarity_threshold
        ]
        below_threshold = passages_with_similarity[
            passages_with_similarity["similarity"] <= similarity_threshold
        ]

        logger.info(
            f"Found {len(above_threshold)} passages above threshold {similarity_threshold}"
        )
        logger.info(f"Found {len(below_threshold)} passages below threshold")

        # Selection strategy:
        # 1. If we have enough above threshold, take all of them, up to max_passages.
        # 2. If we don't have enough above threshold, take everything which is above
        #    the threshold, and then supplement the list with the passages which are
        #    closest to the threshold to reach min_passages.
        if len(above_threshold) >= min_passages:
            selected_passages = above_threshold
        else:
            # Sort below_threshold by distance from threshold (closest first)
            below_threshold = (
                below_threshold.assign(
                    distance_from_threshold=abs(
                        below_threshold["similarity"] - similarity_threshold
                    )
                )
                .sort_values("distance_from_threshold")
                .drop(columns=["distance_from_threshold"])
            )
            remaining_needed = min_passages - len(above_threshold)
            selected_passages = pd.concat(
                [above_threshold, below_threshold.head(remaining_needed)]
            )

        # Ensure we don't exceed max_passages in either scenario
        selected_passages = selected_passages.head(max_passages)

        # Reset index to get sequential integers for progress tracking
        selected_passages = selected_passages.reset_index(drop=True)

        logger.info(f"Selected {len(selected_passages)} passages")
        max_similarity = max(selected_passages["similarity"])
        min_similarity = min(selected_passages["similarity"])
        logger.info(f"Similarity range: {min_similarity:.3f}-{max_similarity:.3f}")

        classifier = ClassifierFactory.create(concept)
        logger.info(f"Created a {classifier}")

        classifier_metadata = {
            "id": classifier.id,
            "name": str(classifier),
            "date": datetime.now().date().isoformat(),
        }

        # Run inference for the concept
        logger.info(f"Running inference for {classifier}")
        # Calculate total passages for progress tracking
        n_passages = len(selected_passages)

        labelled_passages: list[LabelledPassage] = []
        assert isinstance(selected_passages, pd.DataFrame)
        for idx, (_, row) in enumerate(selected_passages.iterrows()):
            text = str(row["text_block.text"])
            predicted_spans = classifier.predict(text)
            text_block_metadata = {str(k): str(v) for k, v in row.to_dict().items()}
            labelled_passage = LabelledPassage(
                text=text,
                spans=predicted_spans,
                metadata=text_block_metadata,
            )
            labelled_passages.append(labelled_passage)

            # Update progress every 50 passages (or on the last passage)
            passage_num = idx + 1
            if passage_num % 50 == 0 or passage_num == n_passages:
                progress = (passage_num / n_passages) * 100
                update_progress_artifact(
                    progress_id,  # type: ignore
                    progress=progress,
                    description=f"Processed passage {passage_num}/{n_passages}",
                )

        logger.info(f"Generated {len(labelled_passages)} labelled passages")

        # before uploading the passages, we should shuffle them
        random.shuffle(labelled_passages)

        output_prefix = Path(wikibase_id) / classifier.id
        logger.info(f"Outputs will be stored in s3://{BUCKET_NAME}/{output_prefix}")

        # Push results for this concept to S3
        jsonl_string = "\n".join(
            [
                json.dumps(
                    {
                        "marked_up_text": labelled_passage.get_highlighted_text(
                            start_pattern='<span class="prediction-highlight">',
                            end_pattern="</span>",
                        ),
                        **json.loads(labelled_passage.model_dump_json()),
                    }
                )
                for labelled_passage in labelled_passages
            ]
        )

        logger.info(f"Pushing predictions to S3: {output_prefix / 'predictions.jsonl'}")
        push_object_bytes_to_s3(
            s3_client=s3_client,
            key=output_prefix / "predictions.jsonl",
            data=jsonl_string.encode("utf-8"),
        )

        logger.info(f"Pushing concept data to S3: {output_prefix / 'concept.json'}")
        push_object_bytes_to_s3(
            s3_client=s3_client,
            key=output_prefix / "concept.json",
            data=concept.model_dump_json().encode("utf-8"),
        )

        logger.info(
            f"Pushing classifier metadata to S3: {output_prefix / 'classifier.json'}"
        )
        push_object_bytes_to_s3(
            s3_client=s3_client,
            key=output_prefix / "classifier.json",
            data=json.dumps(classifier_metadata).encode("utf-8"),
        )

        n_positive_passages = sum(1 for passage in labelled_passages if passage.spans)
        n_passages = len(labelled_passages)

        result = {
            "concept_id": wikibase_id,
            "preferred_label": concept.preferred_label,
            "n_passages": n_passages,
            "n_positive_passages": n_positive_passages,
            "output_prefix": str(output_prefix),
            "status": "success",
        }

        logger.info(
            f"Completed processing {wikibase_id} ({n_positive_passages}/{len(labelled_passages)} positive)"
        )
        update_progress_artifact(
            progress_id,  # type: ignore
            progress=100.0,
            description="Inference completed successfully",
        )
        return result

    except (ValueError, RuntimeError, ConnectionError) as e:
        logger.error(f"Failed to process concept {wikibase_id}: {str(e)}")
        # Return failure result instead of raising exception
        # This prevents one concept failure from stopping others
        return {
            "concept_id": wikibase_id,
            "status": "failed",
            "error": str(e),
            "n_passages": len(passages_dataset),
            "n_positive_passages": 0,
            "output_prefix": "",
        }


def _run_inference_on_concepts(wikibase_ids: list[WikibaseID]) -> list[dict]:
    """
    Core inference logic: submit tasks for each concept and collect results.

    Args:
        wikibase_ids: List of Wikibase IDs to process
        passages_dataset: DataFrame of passages
        passages_embeddings: Pre-computed embeddings
        embedding_model: SentenceTransformer model instance

    Returns:
        List of result dicts with keys: concept_id, status, n_passages, etc.
    """
    logger.info("Loading dataset...")
    passages_dataset = load_passages_dataset()
    logger.info(f"Loaded {len(passages_dataset)} passages from the dataset")

    logger.info("Loading embeddings...")
    passages_embeddings = load_embeddings()
    logger.info(f"Loaded {passages_embeddings.shape[0]} embeddings")

    logger.info("Loading embeddings metadata...")
    passages_embeddings_metadata = load_embeddings_metadata()
    logger.info("Loaded embeddings generation metadata")

    logger.info("Loading embedding model...")
    embedding_model_name = passages_embeddings_metadata["embedding_model_name"]
    embedding_model = SentenceTransformer(embedding_model_name)
    logger.info(f"Loaded embedding model: {embedding_model_name}")

    # Submit a separate inference task for each of the concepts, and then wait for all
    logger.info(f"Starting parallel inference of {len(wikibase_ids)} concepts...")
    concept_futures = []
    for wikibase_id in wikibase_ids:
        future = process_single_concept.submit(
            wikibase_id=wikibase_id,
            passages_dataset=passages_dataset,
            passages_embeddings=passages_embeddings,
            embedding_model=embedding_model,
        )
        concept_futures.append(future)

    logger.info("Waiting for all concept inference tasks to complete...")
    wait(concept_futures)

    # Track completion and collect results
    collected_results = []
    for future in concept_futures:
        try:
            result = future.result()
            collected_results.append(result)
        except (ValueError, RuntimeError) as e:
            logger.error(f"Unexpected error collecting result: {str(e)}")
            # This shouldn't happen with our error handling in process_single_concept
            continue

    # Log summary results
    logger.info("Completed processing all concepts")
    successful_results = [r for r in collected_results if r.get("status") == "success"]
    failed_results = [r for r in collected_results if r.get("status") == "failed"]

    # Log successful results
    for result in sorted(successful_results, key=lambda x: x["concept_id"]):
        logger.info(
            f"✓ {result['concept_id']}: "
            f"{result['n_positive_passages']}/{result['n_passages']} "
            f"({result['percentage']:.2f}%) - {result['output_prefix']}"
        )

    # Log failed results
    if failed_results:
        logger.warning(f"⚠️  {len(failed_results)} concepts failed to process")
        for failed in failed_results:
            logger.error(
                f"✗ {failed['concept_id']}: {failed.get('error', 'Unknown error')}"
            )

    logger.info(
        f"Successfully processed {len(successful_results)}/{len(collected_results)} concepts"
    )

    return collected_results


@flow(  # pyright: ignore[reportCallIssue]
    timeout_seconds=None,
    task_runner=ThreadPoolTaskRunner(max_workers=10),  # pyright: ignore[reportArgumentType]
)
def inference_from_config():
    """
    Run inference on all concepts defined in concepts.yml (S3 config).

    This is the standard CI path that loads the concept list from the S3 configuration.

    Returns:
        List[dict]: Results for each processed concept
    """
    logger.info("Loading wikibase IDs from config...")
    wikibase_ids = load_wikibase_ids_from_s3()
    logger.info(f"Loaded {len(wikibase_ids)} wikibase IDs from the config")
    return _run_inference_on_concepts(wikibase_ids=wikibase_ids)


@flow(  # pyright: ignore[reportCallIssue]
    timeout_seconds=None,
    task_runner=ThreadPoolTaskRunner(max_workers=10),  # pyright: ignore[reportArgumentType]
)
def inference_custom(concept_ids: list[str]):
    """
    Run inference on specific user-provided concepts.

    This is the custom path used by the CLI to run inference on a selected set of concepts.

    Args:
        concept_ids: List of Wikibase IDs to process (e.g., ["Q69", "Q47"])

    Returns:
        List[dict]: Results for each processed concept
    """
    if not concept_ids:
        raise ValueError("concept_ids must not be empty")

    # Convert and validate requested concept IDs
    logger.info(f"Processing requested concepts: {concept_ids}")
    requested_ids = [WikibaseID(id) for id in concept_ids]
    logger.info(f"Processing {len(requested_ids)} requested concept(s)")
    return _run_inference_on_concepts(wikibase_ids=requested_ids)


# CLI Interface
app = typer.Typer(
    name="vibe-checker",
    help="Climate policy vibe checker inference pipeline CLI",
    pretty_exceptions_enable=False,
)


@app.command()
def run(
    concept: Optional[list[str]] = typer.Option(
        None,
        "--concept",
        "-c",
        help=(
            "Specific concept IDs to process (e.g., Q69, Q47). If left empty, "
            "concept IDs will be loaded from the concepts.yml file in S3."
        ),
    ),
) -> None:
    """
    Run inference on climate policy concepts.

    Two modes:
    1. CONFIG mode (default): Process all concepts defined in concepts.yml (S3)
    2. CUSTOM mode: Process only the specified concept IDs

    Examples:
        vibe-checker run                    # CONFIG mode: Run all concepts from config
        vibe-checker run --concept Q69      # CUSTOM mode: Run single concept
        vibe-checker run -c Q69 -c Q47      # CUSTOM mode: Run multiple concepts
    """
    try:
        if concept:
            # Custom mode: user-specified concepts
            typer.echo(f"Running inference for {len(concept)} concept(s)...", err=False)
            inference_custom(concept_ids=concept)
        else:
            # Config mode: load from S3 concepts.yml
            typer.echo("Running inference for all concepts from config...", err=False)
            inference_from_config()
        typer.echo("✓ Inference completed successfully", err=False)
    except ValueError as e:
        typer.echo(f"✗ Error: {str(e)}", err=True)
        raise typer.Exit(code=1)
    except Exception as e:
        typer.echo(f"✗ Unexpected error: {str(e)}", err=True)
        raise typer.Exit(code=1)


if __name__ == "__main__":
    app()
