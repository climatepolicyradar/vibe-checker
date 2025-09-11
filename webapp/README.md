# Webapp

This is a [Next.js](https://nextjs.org) app, which presents an interactive view of the inference results in s3, populated by the [pipeline](../pipeline) flows.

## Getting Started

You can install the relevant dependencies and start a local version of the webapp by running:

```sh
just serve-webapp
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deploying

To push a new version of the webapp to ECR, run:

```sh
just deploy-webapp
```
