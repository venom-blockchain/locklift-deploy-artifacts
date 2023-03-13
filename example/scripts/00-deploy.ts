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
