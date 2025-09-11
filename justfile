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
install: install-pipeline install-webapp install-hooks
    echo "All dependencies installed."

# Install pipeline dependencies via uv
install-pipeline:
    cd {{pipeline_dir}} && uv sync

# Install pre-commit hooks for pipeline via uv
install-hooks:
    cd {{pipeline_dir}} && uv run pre-commit install

# Install webapp dependencies via npm
install-webapp:
    cd {{webapp_dir}} && npm ci

# Lint all code
lint: lint-pipeline lint-webapp

# Lint pipeline code via pre-commit
lint-pipeline:
    cd {{pipeline_dir}} && uv run pre-commit run --all-files

# Lint webapp code via ESLint
lint-webapp:
    cd {{webapp_dir}} && npm run lint

# Export Pulumi outputs to .env.local for local development
export-variables-from-infra:
    cd {{infra_dir}}
    pulumi stack output --json | jq -r 'to_entries | .[] | "\(.key)=\(.value)"' > ../{{webapp_dir}}/.env
    echo "Variables exported to {{webapp_dir}}/.env.local"

# Build the Next.js webapp Docker image
build-webapp:
    cd {{webapp_dir}} && docker build -t vibe-checker-webapp .

serve-webapp: install-webapp
    cd {{webapp_dir}} && npm dev

# Push the Docker image to ECR
push-webapp:
    cd {{infra_dir}}
    export REPO_URL=$(pulumi stack output repository_url)
    cd ../{{webapp_dir}}
    docker tag vibe-checker-webapp:latest $REPO_URL:latest
    aws ecr get-login-password --region {{aws_region}} | docker login --username AWS --password-stdin $REPO_URL
    docker push $REPO_URL:latest

# Deploy AWS infrastructure with Pulumi
deploy-infra:
    cd {{infra_dir}}
    pulumi up

# Full deployment: build image, push to ECR
deploy: build-webapp push-webapp
    echo "Deployment complete!"
