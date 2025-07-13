const hre = require("hardhat");
require("dotenv").config();
require("dotenv").config({ path: ".env.local" });

async function main() {
  console.log("🚀 Starting SimpleTokenLaunchpad deployment to", hre.network.name);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy SimpleTokenLaunchpad
  console.log("\n🏭 Deploying SimpleTokenLaunchpad...");
  const SimpleTokenLaunchpad = await hre.ethers.getContractFactory("SimpleTokenLaunchpad");
  const launchpad = await SimpleTokenLaunchpad.deploy();
  await launchpad.deployed();
  console.log("✅ SimpleTokenLaunchpad deployed to:", launchpad.address);

  // Test creating a simple token
  console.log("\n🧪 Testing token creation...");
  const tx = await launchpad.createSimpleToken("Test Token", "TEST");
  const receipt = await tx.wait();
  
  const event = receipt.events.find(e => e.event === "SimpleTokenCreated");
  if (event) {
    console.log("✅ Test token created:");
    console.log("  Token Address:", event.args.token);
    console.log("  Creator:", event.args.creator);
    console.log("  Name:", event.args.name);
    console.log("  Symbol:", event.args.symbol);
    
    // Test minting
    const SimpleCAP20Token = await hre.ethers.getContractFactory("SimpleCAP20Token");
    const testToken = SimpleCAP20Token.attach(event.args.token);
    
    console.log("\n🪙 Testing token minting...");
    const mintTx = await testToken.mint(5, { value: hre.ethers.utils.parseEther("5") });
    await mintTx.wait();
    
    const balance = await testToken.balanceOf(deployer.address);
    console.log("✅ Minted 5 tokens, balance:", hre.ethers.utils.formatEther(balance));
  }

  // Save address to environment variables
  console.log("\n📝 Adding SimpleTokenLaunchpad address to .env.local...");
  const fs = require("fs");
  let envContent = fs.readFileSync(".env.local", "utf8");
  
  // Add or update the simple launchpad address
  if (envContent.includes("NEXT_PUBLIC_SIMPLE_LAUNCHPAD_ADDRESS=")) {
    envContent = envContent.replace(
      /NEXT_PUBLIC_SIMPLE_LAUNCHPAD_ADDRESS=.*/,
      `NEXT_PUBLIC_SIMPLE_LAUNCHPAD_ADDRESS="${launchpad.address}"`
    );
  } else {
    envContent += `\nNEXT_PUBLIC_SIMPLE_LAUNCHPAD_ADDRESS="${launchpad.address}"\n`;
  }
  
  fs.writeFileSync(".env.local", envContent);
  console.log("✅ .env.local updated with SimpleTokenLaunchpad address");

  console.log("\n🎉 SimpleTokenLaunchpad deployment completed!");
  console.log("📄 Contract address:", launchpad.address);
  console.log("🔗 Network:", hre.network.name);
  console.log("💰 Token price: 1 CHZ per token");
}

main().catch((error) => {
  console.error("❌ SimpleTokenLaunchpad deployment failed:", error);
  process.exitCode = 1;
});