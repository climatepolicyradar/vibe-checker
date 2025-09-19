import io
import json
import logging
import os
from datetime import datetime
from pathlib import Path

import boto3
import numpy as np
import pandas as pd
import yaml
from knowledge_graph.classifier import ClassifierFactory
from knowledge_graph.identifiers import WikibaseID
from knowledge_graph.labelled_passage import LabelledPassage
from knowledge_graph.wikibase import WikibaseSession
from more_itertools import chunked_even
from mypy_boto3_s3 import S3Client
from prefect import flow, task
from prefect.artifacts import create_progress_artifact, update_progress_artifact
from prefect.futures import wait
from prefect.logging import get_logger
from prefect.task_runners import ThreadPoolTaskRunner
from rich.logging import RichHandler
from sentence_transformers import SentenceTransformer

# Constants
BATCH_SIZE = 1000

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


def push_object_bytes_to_s3(s3_client: S3Client, key: str | Path, bytes: bytes) -> None:
    """Push bytes to S3 object."""
    s3_client.put_object(Bucket=BUCKET_NAME, Key=str(key), Body=bytes)


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
    return dataset


@task(retries=3, retry_delay_seconds=5)
def load_config(config_file_name: str = "concepts.yml") -> list[WikibaseID]:
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
    passages: list[str],
    passages_embeddings: np.ndarray,
    passages_embeddings_metadata: dict,
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

        embedding_model_name = passages_embeddings_metadata["embedding_model_name"]
        embedding_model = SentenceTransformer(embedding_model_name)
        concept_embedding = embedding_model.encode(concept.to_markdown())

        # Batch compute similarities using pre-computed embeddings
        logger.info(f"Computing similarities for {len(passages)} passages...")
        similarities = passages_embeddings @ concept_embedding  # Shape: (n_passages,)

        similarity_threshold = 0.65
        min_passages = 10_000
        max_passages = 100_000

        # Get indices and similarities for all passages
        passage_indices = list(range(len(passages)))
        passage_similarities = list(zip(passage_indices, similarities, passages))

        # Sort by similarity (highest first)
        passage_similarities.sort(key=lambda x: x[1], reverse=True)

        # Separate the passages which are above and below the threshold similarity to
        # our concept embedding.
        above_threshold = [
            (idx, sim, text)
            for idx, sim, text in passage_similarities
            if sim > similarity_threshold
        ]
        below_threshold = [
            (idx, sim, text)
            for idx, sim, text in passage_similarities
            if sim <= similarity_threshold
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
        selected_passages = []
        if len(above_threshold) >= min_passages:
            selected_passages = above_threshold
        else:
            selected_passages = above_threshold.copy()
            # Sort below_threshold by distance from threshold (closest first)
            below_threshold.sort(key=lambda x: abs(x[1] - similarity_threshold))
            remaining_needed = min_passages - len(selected_passages)
            selected_passages.extend(below_threshold[:remaining_needed])

        # Ensure we don't exceed max_passages in either scenario
        selected_passages = selected_passages[:max_passages]

        # Sort selected passages back to original order for consistent processing
        selected_passages.sort(key=lambda x: x[0])
        passages_to_predict_on = [text for _, _, text in selected_passages]

        logger.info(f"Selected {len(passages_to_predict_on)} passages")
        logger.info(
            f"Similarity range: {min(s[1] for s in selected_passages):.3f} - {max(s[1] for s in selected_passages):.3f}"
        )

        if above_threshold:
            above_in_selection = sum(
                1 for s in selected_passages if s[1] > similarity_threshold
            )
            logger.info(
                f"Above threshold in selection: {above_in_selection}/{len(selected_passages)} ({above_in_selection / len(selected_passages) * 100:.1f}%)"
            )

        classifier = ClassifierFactory.create(concept)
        logger.info(f"Created a {classifier}")

        # Run inference for the concept
        logger.info(f"Running inference for {classifier} in batches of {BATCH_SIZE}")
        # Calculate total batches without consuming iterator
        n_batches = (len(passages) + BATCH_SIZE - 1) // BATCH_SIZE

        labelled_passages: list[LabelledPassage] = []
        for i, batch in enumerate(chunked_even(passages_to_predict_on, BATCH_SIZE)):
            predictions = classifier.predict_batch(batch)
            for text, predicted_spans in zip(batch, predictions):
                labelled_passage = LabelledPassage(text=text, spans=predicted_spans)
                labelled_passages.append(labelled_passage)

            # Update progress every 50 batches (or on the last batch)
            if (i + 1) % 50 == 0 or (i + 1) == n_batches:
                progress = ((i + 1) / n_batches) * 100
                update_progress_artifact(
                    progress_id,  # type: ignore
                    progress=progress,
                    description=f"Processed batch {i + 1}/{n_batches}",
                )

        logger.info(f"Generated {len(labelled_passages)} labelled passages")

        output_prefix = Path(wikibase_id) / classifier.id
        logger.info(f"Outputs will be stored in s3://{BUCKET_NAME}/{output_prefix}")

        # Push results for this concept to S3
        jsonl_string = "\n".join(
            [
                labelled_passage.model_dump_json()
                for labelled_passage in labelled_passages
            ]
        )
        logger.info(f"Pushing predictions to S3: {output_prefix / 'predictions.jsonl'}")
        push_object_bytes_to_s3(
            s3_client=s3_client,
            key=output_prefix / "predictions.jsonl",
            bytes=jsonl_string.encode("utf-8"),
        )

        # Push concept data to S3
        push_object_bytes_to_s3(
            s3_client=s3_client,
            key=output_prefix / "concept.json",
            bytes=concept.model_dump_json().encode("utf-8"),
        )

        # Push classifier metadata to S3
        classifier_data = {
            "id": classifier.id,
            "string": str(classifier),
            "name": classifier.name,
            "date": datetime.now().date().isoformat(),
        }
        push_object_bytes_to_s3(
            s3_client=s3_client,
            key=output_prefix / "classifier.json",
            bytes=json.dumps(classifier_data).encode("utf-8"),
        )

        # Calculate statistics about the results and push them to S3
        n_positive_passages = sum(1 for passage in labelled_passages if passage.spans)
        n_passages = len(labelled_passages)
        percentage_positive = (
            (n_positive_passages / n_passages * 100) if n_passages > 0 else 0.0
        )
        stats = {
            "n_positive_passages": n_positive_passages,
            "n_negative_passages": len(labelled_passages) - n_positive_passages,
            "percentage": percentage_positive,
        }

        push_object_bytes_to_s3(
            s3_client=s3_client,
            key=output_prefix / "stats.json",
            bytes=json.dumps(stats).encode("utf-8"),
        )

        result = {
            "concept_id": wikibase_id,
            "preferred_label": concept.preferred_label,
            "n_passages": n_passages,
            "n_positive_passages": n_positive_passages,
            "percentage": percentage_positive,
            "output_prefix": output_prefix,
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
            "total_passages": len(passages),
            "positive_passages": 0,
            "percentage": 0.0,
        }


@flow(  # pyright: ignore[reportCallIssue]
    timeout_seconds=None,
    task_runner=ThreadPoolTaskRunner(max_workers=3),  # pyright: ignore[reportArgumentType]
)
def vibe_checker_inference():
    """
    Run parallel inference on multiple concepts using their classifiers.

    This flow orchestrates the complete inference pipeline:

    1. Load Data: Fetches passages dataset and concept configurations from S3
    2. Parallel Processing: Runs inference for each concept simultaneously using ThreadPoolTaskRunner
    3. Store Results: Saves structured outputs to S3 in a hierarchical format
    4. Report Statistics: Logs success/failure rates and performance metrics

    S3 Bucket Structure:

    ```
    s3://{BUCKET_NAME}/
    ├── concepts.yml                       # Input: List of Wikibase IDs for which we will run inference
    ├── passages_dataset.feather           # Input: Dataset of passages for inference
    ├── passages_embeddings.npy            # Input: Embeddings of passages for inference
    ├── passages_embeddings_metadata.json  # Input: Metadata about the model used to generate the passages embeddings
    ├── {concept_id}/                      # Output: One directory per concept
    │   ├── {classifier_id}/               # Output: One directory per classifier
    │   │   ├── predictions.jsonl          # Output: All predictions (positive + negative)
    │   │   ├── concept.json               # Output: Concept metadata at inference time
    │   │   ├── classifier.json            # Output: Classifier metadata and config
    │   │   └── stats.json                 # Output: Statistics about the results, eg f1 across various equity strata
    │   └── ...                            # Additional classifiers for same concept
    └── ...                                # Additional concepts
    ```

    Returns:
        List[dict]: Results for each concept with keys:
            - concept_id: wikibase_id
            - preferred_label: concept.preferred_label
            - n_passages: n_passages
            - n_positive_passages: n_positive_passages
            - percentage: percentage_positive
            - output_prefix: output_prefix
            - status: "success"
    """
    # Load shared data
    logger.info("Loading dataset...")
    dataset = load_passages_dataset()
    logger.info(f"Loaded {len(dataset)} passages from the dataset")

    logger.info("Loading wikibase IDs...")
    wikibase_ids = load_config()
    logger.info(f"Loaded {len(wikibase_ids)} wikibase IDs from the config")

    logger.info("Loading embeddings...")
    passages_embeddings = load_embeddings()
    logger.info(f"Loaded {passages_embeddings.shape[0]} embeddings")

    logger.info("Loading embeddings metadata...")
    passages_embeddings_metadata = load_embeddings_metadata()
    logger.info("Loaded embeddings generation metadata")

    passages = dataset["text_block.text"].tolist()

    # Create overall progress artifact
    n_concepts = len(wikibase_ids)
    overall_progress_id = create_progress_artifact(
        progress=0.0,
        key="overall-inference",
        description=f"Processing {n_concepts} concepts",
    )

    # Submit a separate inference task for each of the concepts, and then wait for
    # all of them to complete
    logger.info(f"Starting parallel inference of {n_concepts} concepts...")
    concept_futures = []
    for wikibase_id in wikibase_ids:
        future = process_single_concept.submit(
            wikibase_id=wikibase_id,
            passages=passages,
            passages_embeddings=passages_embeddings,
            passages_embeddings_metadata=passages_embeddings_metadata,
        )
        concept_futures.append(future)

    logger.info("Waiting for all concept inference tasks to complete...")
    wait(concept_futures)

    # Track completion progress and collect results
    collected_results = []
    n_completed = 0
    for future in concept_futures:
        try:
            result = future.result()
            collected_results.append(result)
            n_completed += 1
            progress_percentage = (n_completed / n_concepts) * 100.0
            update_progress_artifact(
                overall_progress_id,  # type: ignore
                progress=progress_percentage,
                description=f"Completed {n_completed}/{n_concepts} concepts ({progress_percentage:.1f}%)",
            )
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

    # Mark overall progress as complete
    update_progress_artifact(
        overall_progress_id,  # type: ignore
        progress=100.0,
        description=f"All concepts processed. {len(successful_results)} successful, {len(failed_results)} failed",
    )

    return collected_results


if __name__ == "__main__":
    flow_results = vibe_checker_inference()
