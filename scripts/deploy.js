const hre = require("hardhat");
require("dotenv").config();
require("dotenv").config({ path: ".env.local" });

console.log('rocess.env.PRIVATE_KEY: ', process.env.PRIVATE_KEY);

async function main() {
  console.log("🚀 Starting PumpFight deployment to", hre.network.name);

  const signers = await hre.ethers.getSigners();
  console.log("Available signers:", signers.length);
  
  if (signers.length === 0) {
    throw new Error("No signers available. Check your private key configuration.");
  }
  
  const [deployer] = signers;
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // // Deploy VerificationRegistry first
  // console.log("\n📋 Deploying VerificationRegistry...");
  // const VerificationRegistry = await hre.ethers.getContractFactory("VerificationRegistry");
  // const verificationRegistry = await VerificationRegistry.deploy();
  // await verificationRegistry.deployed();
  // console.log("✅ VerificationRegistry deployed to:", verificationRegistry.address);

  // Deploy PumpFightFactory
  console.log("\n🏭 Deploying PumpFightFactory...");
  const PumpFightFactory = await hre.ethers.getContractFactory("PumpFightFactory");
  const factory = await PumpFightFactory.deploy(
    // verificationRegistry.address,
    process.env.NEXT_PUBLIC_VERIFICATION_REGISTRY_ADDRESS,
    deployer.address // Use deployer address as platform treasury
  );
  await factory.deployed();
  console.log("✅ PumpFightFactory deployed to:", factory.address);

  // Save addresses to environment variables
  console.log("\n📝 Adding contract addresses to .env.local...");
  const fs = require("fs");
  let envContent = fs.readFileSync(".env.local", "utf8");
  envContent = envContent.replace(
    /NEXT_PUBLIC_FACTORY_ADDRESS=.*/,
    `NEXT_PUBLIC_FACTORY_ADDRESS=${factory.address}`
  );
  // envContent = envContent.replace(
  //   /NEXT_PUBLIC_VERIFICATION_REGISTRY_ADDRESS=.*/,
  //   `NEXT_PUBLIC_VERIFICATION_REGISTRY_ADDRESS=${verificationRegistry.address}`
  // );
  // fs.writeFileSync(".env.local", envContent);
  // console.log("✅ .env.local updated with contract addresses");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});