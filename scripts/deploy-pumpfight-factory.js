const hre = require("hardhat");
require("dotenv").config();
require("dotenv").config({ path: ".env.local" });

console.log('Process.env.PRIVATE_KEY: ', process.env.PRIVATE_KEY);

async function main() {
  console.log("🚀 Starting PumpFightFactory deployment to", hre.network.name);

  const signers = await hre.ethers.getSigners();
  console.log("Available signers:", signers.length);
  
  if (signers.length === 0) {
    throw new Error("No signers available. Check your private key configuration.");
  }
  
  const [deployer] = signers;
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Verify VerificationRegistry address is available
  const verificationRegistryAddress = process.env.NEXT_PUBLIC_VERIFICATION_REGISTRY_ADDRESS;
  if (!verificationRegistryAddress) {
    throw new Error("NEXT_PUBLIC_VERIFICATION_REGISTRY_ADDRESS not found in environment. Deploy VerificationRegistry first.");
  }
  console.log("📋 Using VerificationRegistry at:", verificationRegistryAddress);

  // Deploy PumpFightFactory
  console.log("\n🏭 Deploying PumpFightFactory...");
  const PumpFightFactory = await hre.ethers.getContractFactory("PumpFightFactory");
  const factory = await PumpFightFactory.deploy(
    deployer.address // Use deployer address as platform treasury
  );
  await factory.deployed();
  console.log("✅ PumpFightFactory deployed to:", factory.address);

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
  console.log("📋 VerificationRegistry:", verificationRegistryAddress);
  console.log("💰 Platform Treasury:", deployer.address);
  console.log("🔗 Network:", hre.network.name);
}

main().catch((error) => {
  console.error("❌ PumpFightFactory deployment failed:", error);
  process.exitCode = 1;
});