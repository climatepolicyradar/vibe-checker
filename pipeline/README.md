# Inference Pipeline

Prefect flow for running inference on passages and pushing the results tothe vibe checker.

The code in this directory can be run as a Prefect flow, or as a standalone CLI.

## Setup

You'll need to install the dependencies and set a bunch of environment variables by running:

```bash
just install-pipeline
just export-environment-variables-from-infra
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

## Deploying and running the Prefect flow

First, you'll need to login to Prefect Cloud and create a work pool:

```bash
prefect cloud login
prefect work-pool create vibe-checker-pool --type docker  # one-time setup

prefect deploy --name vibe-check-inference inference.py:inference_from_config
prefect deploy --name vibe-check-inference-custom inference.py:inference_custom
```

### Run Deployments

```bash
prefect deployment run vibe-check-inference/vibe-check-inference
prefect deployment run vibe-check-inference-custom/vibe-check-inference-custom --param concept_ids='["Q69"]'
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
