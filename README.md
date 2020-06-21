# Ignite

This repo contains an Azure Devops build task that executes an installer based on [Burn](https://wixtoolset.org/documentation/manual/v3/bundle/). It reports the bundles progress to azure Azure Devops and collects logs which are then added are attached to the build. This task can be added to build and release pipelines.

## Build and package

Run

```bash
npm ci
```

to install the dependencies. Then run

```bash
npm run build
```

to build the solution.

Finally, execute

```bash
npm run package+
```

to create a package ready for publishing.