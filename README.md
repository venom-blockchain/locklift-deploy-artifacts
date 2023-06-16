<p align="center">
  <a href="https://github.com/venom-blockchain/developer-program">
    <img src="https://raw.githubusercontent.com/venom-blockchain/developer-program/main/vf-dev-program.png" alt="Logo" width="366.8" height="146.4">
  </a>
</p>

# Deploy artifacts plugin

[Locklift](https://github.com/broxus/locklift) plugin that enables you to store build artifacts across contract migration scripts.

## Installation

1. Install plugin.

```bash
npm i --save-dev locklift-deploy-artifacts
```

2. Initialize the plugin via the `locklift.config.ts` file.

```ts
// locklift.config.ts
// ...
import { FactorySource } from "./build/factorySource";
import { DeployArtifactsExtension } from "locklift-deploy-artifacts";
import "locklift-deploy-artifacts";

declare module "locklift" {
  export interface Locklift<FactorySource> extends DeployArtifactsExtension<FactorySource> {}
}
// ...
```

## Usage

The deploy artifacts plugin provides methods to interact with the build artifacts.

### deployContract()

This method deploys a contract and saves its artifacts to the `./artifacts` directory.

It takes arguments:

- `alias` - the alias of the contract
- `version` - the version of the contract, use "latest" to increment version
- `args` - the deployment parameters, the same as you use at `locklift.factory.deployContract()`
- `deployFn` - the function to deploy contract, default value `locklift.factory.deployContract`

```ts
const { contract, tx } = await locklift.deployArtifacts.deployContract(alias, version, args);
```

### getArtifacts()

This method returns an object with the current state of the build artifacts:

```ts
// scripts/get_deploy_artifacts.ts
import { IDeployArtifacts } from "../artifacts/artifacts";
const artifacts = locklift.deployArtifacts.getArtifacts<IDeployArtifacts>();
console.log("SampleA contract address", artifacts.local.SampleA.v0.address)
```

![read deploy artifacts](https://raw.githubusercontent.com/venom-blockchain/locklift-deploy-artifacts/main/assets/read_deploy_artifacts.png?token=GHSAT0AAAAAAB73MB3NU47KJSJHE3WWGGL4ZAPHIAQ)

### reset()

This method deletes all artifacts and resets storage:

```ts
locklift.deployArtifacts.reset();
```

### getContract()

This method returns the instance of the deployed contract.

```ts
// scripts/get_deployed_contract.ts
import { IDeployArtifacts } from "../artifacts/artifacts";

async function main() {
  const artifacts = locklift.deployArtifacts.getArtifacts<IDeployArtifacts>();

  const sampleAv0 = locklift.deployArtifacts.getContract(artifacts.test.Sample.SampleA.v0);

  const details = await sampleAv0.methods.getDetails().call();
  console.log("details", details);
}
main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });

```

### deploy contract with [locklift-deploy-private](https://www.npmjs.com/package/locklift-private-deploy) plugin

```ts
// locklift.config.ts
import { LockliftConfig } from "locklift";
import { FactorySource } from "./build/factorySource";

import { DeployArtifactsExtension } from "locklift-deploy-artifacts";
import { LockliftConfigExtension, PrivateDeployerExtension } from "locklift-private-deploy";
import "locklift-deploy-artifacts";
import "locklift-private-deploy";

declare module "locklift" {
  export interface Locklift<FactorySource>
    extends DeployArtifactsExtension<FactorySource>,
      PrivateDeployerExtension<FactorySource> {}
  export interface LockliftConfig extends LockliftConfigExtension {}
}
declare global {
  const locklift: import("locklift").Locklift<FactorySource>;
}

const LOCAL_NETWORK_ENDPOINT = "http://localhost/graphql";

const VENOM_TESTNET_ENDPOINT = process.env.VENOM_TESTNET_ENDPOINT || "https://jrpc-testnet.venom.foundation/rpc";
const VENOM_TESTNET_TRACE_ENDPOINT =
  process.env.VENOM_TESTNET_TRACE_ENDPOINT || "https://gql-testnet.venom.foundation/graphql";

const config: LockliftConfig = {
  privateRPC: "https://private-rpc.com/rpc",
  // ...
}
```

```ts
// scripts/deploy.ts
async function main() {
  console.log("Starting Sample contract deployment...");

  const signer = (await locklift.keystore.getSigner("0"))!;

  const { contract: sample } = await locklift.deployArtifacts.deployContract(
    "SampleA",
    "latest",
    {
      contract: "Sample",
      publicKey: signer.publicKey,
      initParams: { _nonce: locklift.utils.getRandomNonce() },
      constructorParams: { _state: 0 },
      value: locklift.utils.toNano(1),
    },
    locklift.privateRPC.deployContract, // specify deploy function here
  );

  console.log("sample contract address:", sample.address.toString());
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
```
