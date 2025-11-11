set shell := ["bash", "-eu", "-o", "pipefail", "-c"]
aws_region := env_var_or_default('AWS_REGION', 'eu-west-1')
aws_profile := env_var_or_default('AWS_PROFILE', 'labs')
pipeline_dir := 'pipeline'
webapp_dir := 'webapp'
infra_dir := 'infra'

# Show available recipes by default
help:
    just --list

# Install all dependencies
install: install-python install-webapp install-hooks

# Install Python dependencies via uv (all groups by default)
install-python:
    uv sync --all-extras

# Install the dependencies for infrastructure deployment
install-infra:
    uv sync --extra infra

# install dependencies for running pipeline flows
install-pipeline:
    uv sync --extra pipeline

# install dev dependencies
install-dev:
    uv sync --extra dev

# Install pre-commit hooks via uv
install-hooks:
    uv run pre-commit install

# Install webapp dependencies via npm
install-webapp:
    cd {{webapp_dir}} && npm ci

# Lint all code
lint: lint-python lint-webapp

# Lint Python code via pre-commit (covers both infra and pipeline)
lint-python:
    uv run pre-commit run --all-files

# Lint webapp code via ESLint
lint-webapp:
    cd {{webapp_dir}} && npm run lint

# Export Pulumi outputs to .env.local for local development
export-environment-variables-from-infra:
    cd {{infra_dir}}
    pulumi stack output --json | jq -r 'to_entries | .[] | "\(.key)=\(.value)"' > ../{{webapp_dir}}/.env
    echo "Variables exported to {{webapp_dir}}/.env.local"

# Deploy AWS infrastructure with Pulumi
deploy-infra:
    cd {{infra_dir}}
    pulumi up
    
# Build the Next.js webapp Docker image for Linux x86-64 (AWS)
build-webapp:
    cd {{webapp_dir}} && docker buildx build --platform linux/amd64 -t vibe-checker-webapp .

serve-webapp: install-webapp
    cd {{webapp_dir}} && npm run dev

# Push the Docker image to ECR
push-webapp:
    cd {{infra_dir}}
    export REPO_URL=$(pulumi stack output repository_url)
    cd ../{{webapp_dir}}
    docker tag vibe-checker-webapp:latest $REPO_URL:latest
    aws ecr get-login-password --region {{aws_region}} | docker login --username AWS --password-stdin $REPO_URL
    docker push $REPO_URL:latest

# refresh the ecs task definition
refresh-webapp-task:
    cd {{infra_dir}}
    export CLUSTER_NAME=$(pulumi stack output cluster_name)
    export SERVICE_NAME=$(pulumi stack output service_name)
    aws ecs update-service --cluster $CLUSTER_NAME --service $SERVICE_NAME --force-new-deployment

# Run all steps to deploy the webapp
deploy-webapp: build-webapp push-webapp refresh-webapp-task

# Deploy the Prefect inference pipeline
deploy-pipeline:
    cd {{pipeline_dir}}
    export BUCKET_NAME=$(cd ../{{infra_dir}} && pulumi stack output bucket_name)
    export AWS_REGION={{aws_region}}
    export AWS_PROFILE={{aws_profile}}
    prefect cloud login
    prefect deploy --name vibe-checker-inference

# Run the deployed inference pipeline
run-pipeline:
    prefect deployment run vibe-checker-inference/vibe-checker-inference

# Check pipeline deployment status
check-pipeline:
    prefect deployment ls
    prefect flow-run ls
