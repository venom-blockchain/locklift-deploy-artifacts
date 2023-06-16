import { Address, Contract } from "everscale-inpage-provider";
import { Locklift } from "locklift";
import { DeployContractParams, FactoryType } from "locklift/internal/factory";
import { DeployTransaction, TransactionWithOutput } from "locklift/types";

import { Artifacts, ContractVersion } from "./artifacts";

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

  getContract<ABI>(ver: ContractVersion<ABI>) {
    const contract = new this.locklift.provider.Contract(ver.abi as ABI, new Address(ver.address));
    return contract;
  }

  async deployContract<ContractName extends keyof T>(
    alias: string,
    version: string,
    args: DeployContractParams<T, ContractName>,
    deployFn?: <ContractName extends keyof T>(
      args: DeployContractParams<T, ContractName>,
    ) => Promise<
      {
        contract: Contract<T[ContractName]>;
      } & {
        tx: TransactionWithOutput;
      }
    >,
  ): Promise<{ contract: Contract<T[ContractName]> } & DeployTransaction> {
    const locklift = this.locklift;
    const { tvc, abi, codeHash, code } = locklift.factory.getContractArtifacts(args.contract);

    const network = locklift.context.network.name;
    const contractName = args.contract.toString();

    const fn = deployFn || locklift.factory.deployContract;
    const { contract, tx } = await fn(args);

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
