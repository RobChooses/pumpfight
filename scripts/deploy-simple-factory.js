const hre = require("hardhat");
require("dotenv").config();
require("dotenv").config({ path: ".env.local" });

console.log('Process.env.PRIVATE_KEY: ', process.env.PRIVATE_KEY);

async function main() {
  console.log("🚀 Starting PumpFightFactory deployment (without verification) to", hre.network.name);

  const signers = await hre.ethers.getSigners();
  console.log("Available signers:", signers.length);
  
  if (signers.length === 0) {
    throw new Error("No signers available. Check your private key configuration.");
  }
  
  const [deployer] = signers;
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy PumpFightFactory without verification registry
  console.log("\n🏭 Deploying PumpFightFactory (simplified)...");
  const PumpFightFactory = await hre.ethers.getContractFactory("PumpFightFactory");
  const factory = await PumpFightFactory.deploy(
    deployer.address // Use deployer address as platform treasury
  );
  await factory.deployed();
  console.log("✅ PumpFightFactory deployed to:", factory.address);

  // Check configuration
  console.log("\n🔧 Factory Configuration:");
  const defaultConfig = await factory.defaultConfig();
  console.log("  Initial Price:", hre.ethers.utils.formatEther(defaultConfig.initialPrice), "CHZ");
  console.log("  Step Multiplier:", defaultConfig.stepMultiplier.toString());
  console.log("  Step Size:", hre.ethers.utils.formatEther(defaultConfig.stepSize));
  console.log("  Graduation Target:", hre.ethers.utils.formatEther(defaultConfig.graduationTarget));
  console.log("  Creator Share:", defaultConfig.creatorShare.toString(), "basis points");
  console.log("  Platform Fee:", defaultConfig.platformFee.toString(), "basis points");
  console.log("  Max Supply:", hre.ethers.utils.formatEther(defaultConfig.maxSupply));

  const creationFee = await factory.creationFee();
  console.log("  Creation Fee:", hre.ethers.utils.formatEther(creationFee), "CHZ");

  const vestingPeriod = await factory.creatorVestingPeriod();
  console.log("  Vesting Period:", vestingPeriod.toString(), "seconds");

  const platformTreasury = await factory.platformTreasury();
  console.log("  Platform Treasury:", platformTreasury);

  // Save address to environment variables
  console.log("\n📝 Adding PumpFightFactory address to .env.local...");
  const fs = require("fs");
  let envContent = fs.readFileSync(".env.local", "utf8");
  envContent = envContent.replace(
    /NEXT_PUBLIC_FACTORY_ADDRESS=.*/,
    `NEXT_PUBLIC_FACTORY_ADDRESS="${factory.address}"`
  );
  fs.writeFileSync(".env.local", envContent);
  console.log("✅ .env.local updated with PumpFightFactory address");

  console.log("\n🎉 PumpFightFactory deployment completed!");
  console.log("📄 Contract address:", factory.address);
  console.log("💰 Platform Treasury:", platformTreasury);
  console.log("🔗 Network:", hre.network.name);
  console.log("\n🚀 Anyone can now create fighter tokens!");
}

main().catch((error) => {
  console.error("❌ PumpFightFactory deployment failed:", error);
  process.exitCode = 1;
});