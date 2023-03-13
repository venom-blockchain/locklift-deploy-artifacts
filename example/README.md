# Locklift deploy artifacts plugin example

In this example, we will deploy a sample contract, save deploy artifacts and read artifacts from another migration script.

First, we need to install all required dependencies.

```bash
npm i
```

We will deploy the contract to the local network. So we need to start the local node:
```bash
npm run run:local-node

# to stop local-node, use command:
# npm run stop:local-node
```

The next step is the initialize plugin via `locklift.config.ts` file:
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

Great! We are ready to deploy our contract via locklift-deploy-artifacts plugin. So let's take a look at the actual deployment script. You can find it in the `./scripts` directory:
```ts
// ./scripts/00-deploy.ts
async function main() {
  console.log("Starting Sample contract deployment...");

  const signer = (await locklift.keystore.getSigner("0"))!;

  const { contract: sample } = await locklift.deployArtifacts.deployContract("SampleA", "latest", {
    contract: "Sample",
    publicKey: signer.publicKey,
    initParams: { _nonce: 0 },
    constructorParams: { _state: 0 },
    value: locklift.utils.toNano(3),
  });

  console.log("sample contract address:", sample.address.toString());
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
```

Now we are ready to deploy our contract:
```bash
npx locklift run --network local --script scripts/00-deploy.ts
```

After you run this command, the plugin will try to deploy contract and save deploy artifacts on success. 

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
