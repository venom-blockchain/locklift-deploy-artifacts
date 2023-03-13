<p align="center">
  <a href="https://github.com/venom-blockchain/developer-program">
    <img src="https://raw.githubusercontent.com/venom-blockchain/developer-program/main/vf-dev-program.png" alt="Logo" width="366.8" height="146.4">
  </a>
</p>

# Locklift deploy artifacts plugin example

In this example, we will deploy a sample contract, save deploy artifacts and read artifacts from another migration script.

First, we need to install all required dependencies.

```bash
npm i
```

We will deploy the contract to the local network. So we need to run the local node:
```bash
npm run run:local-node

# to stop local-node, use command:
# npm run stop:local-node
```

The next step is to initialize plugin via `locklift.config.ts` file:
```ts
// locklift.config.ts

// ...
import { DeployArtifactsExtension } from "locklift-deploy-artifacts";
import "locklift-deploy-artifacts";

declare module "locklift" {
  export interface Locklift<FactorySource> extends DeployArtifactsExtension<FactorySource> {}
}
// ...

```

Great! We have installed all dependencies and run local node. So we are ready to deploy our contract:
```bash
npx locklift run --network local --script scripts/00-deploy.ts
```

After you run this command, the plugin will try to deploy the contract and save deploy artifacts on success. 

Artifacts would be saved to the `./artifacts` directory:
```bash
tree -L 1 ./artifacts
# output:
# ./artifacts
# ├── artifacts.d.ts 
# ├── journal.json
# └── local
```


To read artifacts we need to import `IDeployArtifacts` interface and pass it to the `getArtifacts` method:
```ts
// ./scripts/01-get-deploy-artifacts.ts
import { IDeployArtifacts } from "../artifacts/artifacts";

function main() {
  const artifacts = locklift.deployArtifacts.getArtifacts<IDeployArtifacts>();
  console.log("sample contract (SampleA) address", artifacts.local.Sample.SampleA.v_0.address);
}
main();
```

To delete all artifacts, use `reset()` method:
```ts
// ./scripts/02-reset
function main() {
  locklift.deployArtifacts.reset();
}
main();
```

All scripts are available at the `./scripts` directory.
