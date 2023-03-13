// import * as fs from "fs";
import * as p from "path";
import fs from "fs-extra";

const LATEST_VERSION = "latest";
const TYPE_DEFINITION_FILE = "artifacts.d.ts";

export type NetworkName = string;
export type ContractName = string;
export type AliasName = string;
export type VersionName = string;

export type Data = Map<NetworkName, Contracts>;
export type Contracts = Map<ContractName, Map<AliasName, Map<VersionName, Version>>>;

export type Version = {
  address: string;
  codeHash: string;
  initParams: any;
  constructorParams: any;
  publicKey?: string;
  updatedAt?: number;
  abi: string;
  tvc: string;
  code: string;
};

export type JournalData = Map<NetworkName, JournalContracts>;
export type JournalContracts = Map<ContractName, Map<AliasName, Map<VersionName, JournalVersion>>>;

export type JournalVersion = Omit<Version, "abi" | "tvc" | "code">;

export class Artifacts {
  private data: Data;
  private dir: string;

  constructor(private readonly journalPath: string) {
    this.dir = p.dirname(journalPath);
    this.data = this.load();
  }

  addContract(
    network: string,
    contractName: string,
    aliasName: string,
    versionName: string = LATEST_VERSION,
    version: Version,
  ) {
    let networkContracts = this.data.get(network);
    if (!networkContracts) {
      (networkContracts = new Map()), this.data.set(network, networkContracts);
    }

    let contract = networkContracts.get(contractName);
    if (!contract) {
      contract = new Map();
      networkContracts.set(contractName, contract);
    }

    let alias = contract.get(aliasName);
    if (!alias) {
      alias = new Map();
      contract.set(aliasName, alias);
    }

    version.updatedAt = version.updatedAt ? version.updatedAt : Date.now();
    let ver =
      versionName == LATEST_VERSION ? this.getContractNextVersion(network, contractName, aliasName) : versionName;
    alias.set(ver, version);

    this.saveJournal();
    this.saveContractArtifacts(network, contractName, aliasName, ver, {
      abi: version.abi,
      code: version.code,
      tvc: version.tvc,
    });
    this.saveTypeDefinitions();
  }
  getDataObj(): Data {
    return this.toObject(this.data);
  }

  reset() {
    deleteDirectory(this.dir);
    this.data = new Map();
    this.saveJournal();
    this.saveTypeDefinitions();
  }

  // loadLogData - loads data from json file and fs and returns it as a map of networks
  private load(): Data {
    let data = new Map<string, Contracts>();

    if (fs.existsSync(this.dir) && fs.existsSync(this.journalPath)) {
      const file = fs.readFileSync(this.journalPath, "utf8");
      data = this.parseArtifactsData(file);
    }
    return data;
  }

  // saveLogFile - saves map of networks to json file
  private saveJournal() {
    fs.ensureDirSync(this.dir);
    const journal = this.toObject(this.dataToJournalView());
    fs.writeFileSync(this.journalPath, JSON.stringify(journal, null, 2));
  }

  private saveContractArtifacts(
    network: string,
    contractName: string,
    aliasName: string,
    versionName: string,
    params: {
      abi: any;
      code: string;
      tvc: string;
    },
  ): void {
    const versionPath = p.join(this.dir, network, contractName, aliasName, versionName);

    if (!fs.existsSync(versionPath)) {
      fs.mkdirSync(versionPath, { recursive: true });
    }

    fs.writeFileSync(p.join(versionPath, "tvc"), params.tvc);
    fs.writeFileSync(p.join(versionPath, "abi.json"), JSON.stringify(params.abi, null, 2));
    fs.writeFileSync(p.join(versionPath, "code"), params.code);
  }

  private saveTypeDefinitions() {
    const typeDefinitions = createTypeDefinitions("IDeployArtifacts", this.data);
    fs.writeFileSync(p.join(this.dir, TYPE_DEFINITION_FILE), typeDefinitions);
  }

  private dataToJournalView(): JournalData {
    const res = new Map<string, JournalContracts>();
    for (const [networkName, networkContracts] of this.data.entries()) {
      const contracts = new Map<ContractName, Map<AliasName, Map<string, JournalVersion>>>();
      for (const [contractName, contract] of networkContracts.entries()) {
        const aliases = new Map<AliasName, Map<string, JournalVersion>>();
        for (const [aliasName, alias] of contract.entries()) {
          const versions = new Map<string, JournalVersion>();
          for (const [versionName, version] of alias.entries()) {
            versions.set(versionName, toJournalVersion(version));
          }
          aliases.set(aliasName, versions);
        }
        contracts.set(contractName, aliases);
      }
      res.set(networkName, contracts);
    }
    return res;
  }

  // parse - parses json string and returns map of networks
  private parseArtifactsData(jsonContent: string): Data {
    const parsed = new Map<NetworkName, Map<ContractName, Map<AliasName, Map<VersionName, Version>>>>();
    if (!jsonContent) {
      return parsed;
    }

    const json = JSON.parse(jsonContent);

    Object.keys(json).forEach((networkName) => {
      const networkContracts = json[networkName];
      if (!networkContracts) {
        return parsed;
      }
      const contracts = new Map<ContractName, Map<AliasName, Map<string, Version>>>();

      Object.keys(networkContracts).forEach((contractName) => {
        const contract = networkContracts[contractName];
        const aliases = new Map<string, Map<string, Version>>();
        Object.keys(contract).forEach((aliasName) => {
          const versions = new Map<string, Version>();
          Object.keys(contract[aliasName]).forEach((versionName) => {
            const ver: Version = contract[aliasName][versionName];

            const { abi, code, tvc } = this.getContractArtifacts(networkName, contractName, aliasName, versionName);

            const extended: Version = { ...ver, abi, code, tvc };

            versions.set(versionName, extended);
          });
          aliases.set(aliasName, versions);
        });
        contracts.set(contractName, aliases);
      });

      parsed.set(networkName, contracts);
    });
    return parsed;
  }

  // getContractArtifacts - returns contract artifacts from fs
  private getContractArtifacts(
    network: string,
    contractName: string,
    alias: string,
    versionName: string,
  ): { tvc: string; abi: string; code: string } {
    const versionPath = p.join(this.dir, network, contractName, alias, versionName);
    const tvc = fs.readFileSync(p.join(versionPath, "tvc"), "utf8");
    const abi = fs.readFileSync(p.join(versionPath, "abi.json"), "utf8");
    const code = fs.readFileSync(p.join(versionPath, "code"), "utf8");
    return { tvc, abi, code };
  }

  private getContractNextVersion(network: string, contractName: string, aliasName: string): string {
    let alias = this.data?.get(network)?.get(contractName)?.get(aliasName);
    return alias ? `v_${alias.size}` : "v_0";
  }

  private toObject(map = new Map()): any {
    return Object.fromEntries(
      Array.from(map.entries(), ([k, v]) => (v instanceof Map ? [k, this.toObject(v)] : [k, v])),
    );
  }
}

export function createTypeDefinitions(interfaceName: string, data: Data): string {
  let ii = "";
  for (const [network, contracts] of data) {
    let indent = 2;
    ii += formatIndent(indent, `${network}: {`);

    indent += 2;
    for (const [contract, aliases] of contracts) {
      ii += formatIndent(indent, `${contract}: {`);
      indent += 2;
      for (const [alias, versions] of aliases) {
        ii += formatIndent(indent, `${alias}: {`);
        indent += 2;
        for (const [version, versionData] of versions) {
          ii += formatIndent(indent, `${version}: {`);
          const obj = typeLeafNode(versionData);
          ii += `\n${stringifyObj(obj, indent + 2)}${" ".repeat(indent)}};`;
        }
        indent -= 2;

        ii += formatIndent(indent, `};`);
      }
      indent -= 2;

      ii += formatIndent(indent, `};`);
    }
    indent -= 2;
    ii += formatIndent(indent, `};\n`);
  }
  return `\nexport interface ${interfaceName} {${ii}}\n`;
}

export function stringifyObj(obj: any, indent: number): string {
  let res = "";

  for (const key in obj) {
    if (typeof obj[key] !== "object") {
      res += `${" ".repeat(indent)}${key}: ${obj[key]};\n`;
    } else {
      res += `${" ".repeat(indent)}${key}: {\n${stringifyObj(obj[key], indent + 2)}${" ".repeat(indent)}};\n`;
    }
  }
  return res;
}

function formatIndent(indention: number, mask: string): string {
  return `\n${" ".repeat(indention)}` + mask;
}

function typeLeafNode(obj: any): any {
  if (typeof obj !== "object") {
    return typeof obj;
  }
  const result: any = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (key === "abi") {
        result[key] = "string";
        continue;
      }
      result[key] = typeLeafNode(obj[key]);
    }
  }
  return result;
}

function toJournalVersion(v: Version): JournalVersion {
  return {
    address: v.address,
    codeHash: v.codeHash,
    initParams: v.initParams,
    constructorParams: v.constructorParams,
    publicKey: v.publicKey,
    updatedAt: v.updatedAt,
  };
}

function deleteDirectory(directoryPath: string) {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((file: string) => {
      const filePath = p.join(directoryPath, file);
      if (fs.lstatSync(filePath).isDirectory()) {
        deleteDirectory(filePath);
      } else {
        fs.unlinkSync(filePath);
      }
    });
    fs.rmdirSync(directoryPath);
  }
}
