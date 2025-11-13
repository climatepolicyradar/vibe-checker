# Inference Pipeline

Prefect flow for running inference on passages and pushing the results tothe vibe checker.

The code in this directory can be run as a Prefect flow, or as a standalone CLI.

## Setup

Install the pipeline dependencies:

```bash
just install-pipeline
```

## Using the CLI from your local machine

`inference.py` contains a Prefect flow which runs the inference pipeline on a pre-determined set of passages from our dataset. It also has a CLI interface to run that pipeline, with two modes:

- run the pipeline on all concepts defined in `concepts.yml`
- run the pipeline on a set of concepts specified by the user

Both options will dump the results of the inference to the s3 bucket, in the `{concept_id}/{classifier_id}/` directory, where they'll immediately be available to users via the webapp.

You can run the pipeline on all concepts by running:

```bash
vibe-checker run
```

If instead you want to run the pipeline on a specific set of concepts, you can run eg:

```bash
vibe-checker run --concept Q420 --concept Q69 
```

## S3 Structure

The s3 bucket is structured as follows:

```
s3://{BUCKET_NAME}/
├── concepts.yml                    # Input: The default set of Wikibase IDs to run inference on
├── passages_dataset.feather        # Input: Passages dataset
├── passages_embeddings.npy         # Input: Pre-computed embeddings used to sample potentially relevant passages for a given concept
├── passages_embeddings_metadata.json # Input: Metadata about the embeddings model used to compute the embeddings
├── {concept_id}/{classifier_id}/
│   ├── predictions.jsonl           # Output: All predictions for the given concept and classifier, with one prediction per line. Can contain negatives as well as positives.
│   ├── concept.json                # Output: A full copy of the concept metadata from Wikibase at the time of the inference
│   └── classifier.json             # Output: Metadata about the classifier used to generate the predictions
```

## Updating the `concepts.yml` file

If you want to update the default set of concepts to run inference on, you can edit the `concepts.yml` file and run the inference pipeline again.

First, download the current `concepts.yml` file from s3:

```bash
aws s3 cp s3://{BUCKET_NAME}/concepts.yml concepts.yml
```

Then edit the file as you see fit (sticking to the format of the file), and finally copy the edited file back to s3:

```bash
aws s3 cp concepts.yml s3://{BUCKET_NAME}/concepts.yml
```

The inference pipeline will now process the new set of concepts the next time it's run.

## Working with Prefect

### Deploying the flows to ECS

We use Prefect to run pipelines on AWS ECS infrastructure. You can deploy flows directly from this repo using the `just` recipe:

```bash
just deploy-pipeline
```

This will:

- Authenticate with Prefect Cloud
- Deploy both standard and custom inference flows to `mvp-labs-ecs`

**Note:** The bucket name is automatically discovered from SSM Parameter Store at runtime, so you don't need to configure it.

### Running the deployed flows

```bash
# Run on all concepts in the config.yml file (uses the default inference-all deployment)
just run-pipeline

# Run on specific concepts (uses the custom inference deployment)
just run-pipeline concept_ids='["Q69"]'
just run-pipeline concept_ids='["Q69","Q420"]'
```

### Updating Deployments

When you update the inference pipeline code, make sure you redeploy the flows to update the deployments:

```bash
just deploy-pipeline
```
