import { IDeployArtifacts } from "../artifacts/artifacts";

function main() {
  const artifacts = locklift.deployArtifacts.getArtifacts<IDeployArtifacts>();
  console.log("sample contract (SampleA) address", artifacts.local.Sample.SampleA.v_0.address);
}
main();
