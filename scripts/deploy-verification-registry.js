const hre = require("hardhat");
require("dotenv").config();
require("dotenv").config({ path: ".env.local" });

console.log('Process.env.PRIVATE_KEY: ', process.env.PRIVATE_KEY);

async function main() {
  console.log("🚀 Starting VerificationRegistry deployment to", hre.network.name);

  const signers = await hre.ethers.getSigners();
  console.log("Available signers:", signers.length);
  
  if (signers.length === 0) {
    throw new Error("No signers available. Check your private key configuration.");
  }
  
  const [deployer] = signers;
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy VerificationRegistry
  console.log("\n📋 Deploying VerificationRegistry...");
  const VerificationRegistry = await hre.ethers.getContractFactory("VerificationRegistry");
  const verificationRegistry = await VerificationRegistry.deploy();
  await verificationRegistry.deployed();
  console.log("✅ VerificationRegistry deployed to:", verificationRegistry.address);

  // Save address to environment variables
  console.log("\n📝 Adding VerificationRegistry address to .env.local...");
  const fs = require("fs");
  let envContent = fs.readFileSync(".env.local", "utf8");
  envContent = envContent.replace(
    /NEXT_PUBLIC_VERIFICATION_REGISTRY_ADDRESS=.*/,
    `NEXT_PUBLIC_VERIFICATION_REGISTRY_ADDRESS="${verificationRegistry.address}"`
  );
  fs.writeFileSync(".env.local", envContent);
  console.log("✅ .env.local updated with VerificationRegistry address");

  console.log("\n🎉 VerificationRegistry deployment completed!");
  console.log("📄 Contract address:", verificationRegistry.address);
  console.log("🔗 Network:", hre.network.name);
}

main().catch((error) => {
  console.error("❌ VerificationRegistry deployment failed:", error);
  process.exitCode = 1;
});