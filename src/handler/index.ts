import { Contract, Locklift } from "locklift";
import { DeployContractParams, FactoryType } from "locklift/internal/factory";
import { DeployTransaction } from "locklift/types";

import { Artifacts } from "./artifacts";

const ARTIFACTS_HISTORY_FILE = "./artifacts/journal.json";

export class DeploymentHandler<T extends FactoryType> {
  private readonly artifacts: Artifacts;
  private readonly locklift: Locklift<T>;

  constructor(locklift: Locklift<T>) {
    this.artifacts = new Artifacts(ARTIFACTS_HISTORY_FILE);
    this.locklift = locklift;
  }

  getArtifacts<IDeployArtifacts>(): IDeployArtifacts {
    return this.artifacts.getDataObj() as IDeployArtifacts;
  }

  async deployContract<ContractName extends keyof T>(
    alias: string,
    version: string,
    args: DeployContractParams<T, ContractName>,
  ): Promise<{ contract: Contract<T[ContractName]> } & DeployTransaction> {
    const locklift = this.locklift;
    const { tvc, abi, codeHash, code } = locklift.factory.getContractArtifacts(args.contract);

    const network = locklift.context.network.name;
    const contractName = args.contract.toString();

    const { contract, tx } = await locklift.factory.deployContract(args);

    this.artifacts.addContract(network, contractName, alias, version, {
      address: contract.address.toString(),
      codeHash: codeHash,
      initParams: args.initParams,
      constructorParams: args.constructorParams,
      publicKey: args.publicKey,
      abi: abi,
      tvc: tvc,
      code: code,
    });

    return { contract, tx };
  }

  reset() {
    this.artifacts.reset();
  }
}
