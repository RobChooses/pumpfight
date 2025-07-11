const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting PumpFight deployment to", hre.network.name);
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy VerificationRegistry first
  console.log("\n📋 Deploying VerificationRegistry...");
  const VerificationRegistry = await hre.ethers.getContractFactory("VerificationRegistry");
  const verificationRegistry = await VerificationRegistry.deploy();
  await verificationRegistry.deployed();
  console.log("✅ VerificationRegistry deployed to:", verificationRegistry.address);

  // Deploy PumpFightFactory
  console.log("\n🏭 Deploying PumpFightFactory...");
  const PumpFightFactory = await hre.ethers.getContractFactory("PumpFightFactory");
  const factory = await PumpFightFactory.deploy(
    verificationRegistry.address,
    deployer.address // Use deployer as initial platform treasury
  );
  await factory.deployed();
  console.log("✅ PumpFightFactory deployed to:", factory.address);

  // Verify contracts on block explorer if not on local network
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n🔍 Waiting for block confirmations...");
    await verificationRegistry.deployTransaction.wait(6);
    await factory.deployTransaction.wait(6);

    console.log("\n🔍 Verifying contracts on block explorer...");
    
    try {
      await hre.run("verify:verify", {
        address: verificationRegistry.address,
        constructorArguments: [],
      });
      console.log("✅ VerificationRegistry verified");
    } catch (error) {
      console.log("❌ VerificationRegistry verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: factory.address,
        constructorArguments: [verificationRegistry.address, deployer.address],
      });
      console.log("✅ PumpFightFactory verified");
    } catch (error) {
      console.log("❌ PumpFightFactory verification failed:", error.message);
    }
  }

  // Save deployment addresses
  const deployments = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    verificationRegistry: verificationRegistry.address,
    factory: factory.address,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  const fs = require("fs");
  const path = require("path");
  
  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  // Save deployment info
  fs.writeFileSync(
    path.join(deploymentsDir, `${hre.network.name}.json`),
    JSON.stringify(deployments, null, 2)
  );

  console.log("\n📄 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Network: ${hre.network.name} (Chain ID: ${hre.network.config.chainId})`);
  console.log(`VerificationRegistry: ${verificationRegistry.address}`);
  console.log(`PumpFightFactory: ${factory.address}`);
  console.log(`Platform Treasury: ${deployer.address}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  console.log("\n✅ Deployment completed successfully!");
  
  // Add environment variables instructions
  console.log("\n📝 Add these to your .env file:");
  console.log(`NEXT_PUBLIC_VERIFICATION_REGISTRY_ADDRESS=${verificationRegistry.address}`);
  console.log(`NEXT_PUBLIC_FACTORY_ADDRESS=${factory.address}`);
  
  if (hre.network.name === "chiliz-spicy") {
    console.log("\n🌶️  Chiliz Spicy Testnet Block Explorer:");
    console.log(`https://spicy-blockscout.chiliz.com/address/${factory.address}`);
  } else if (hre.network.name === "chiliz-mainnet") {
    console.log("\n🔥 Chiliz Mainnet Block Explorer:");
    console.log(`https://blockscout.chiliz.com/address/${factory.address}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });