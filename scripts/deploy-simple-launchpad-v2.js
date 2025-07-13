const hre = require("hardhat");
require("dotenv").config();
require("dotenv").config({ path: ".env.local" });

async function main() {
  console.log("🚀 Starting SimpleTokenLaunchpadV2 deployment to", hre.network.name);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy SimpleTokenLaunchpadV2
  console.log("\n🏭 Deploying SimpleTokenLaunchpadV2...");
  const SimpleTokenLaunchpadV2 = await hre.ethers.getContractFactory("SimpleTokenLaunchpadV2");
  const launchpad = await SimpleTokenLaunchpadV2.deploy();
  await launchpad.deployed();
  console.log("✅ SimpleTokenLaunchpadV2 deployed to:", launchpad.address);

  // Show default parameters
  console.log("\n⚙️ Default Bonding Curve Parameters:");
  const [initialPrice, priceIncrement, stepSize] = await launchpad.getDefaultParams();
  console.log("  Initial Price:", hre.ethers.utils.formatEther(initialPrice), "CHZ");
  console.log("  Price Increment:", hre.ethers.utils.formatEther(priceIncrement), "CHZ per step");
  console.log("  Step Size:", hre.ethers.utils.formatEther(stepSize), "tokens");

  // Test creating a token with default parameters
  console.log("\n🧪 Testing token creation with default parameters...");
  const tx = await launchpad.createSimpleToken("Test Bonding Token", "TBT");
  const receipt = await tx.wait();
  
  const event = receipt.events.find(e => e.event === "SimpleTokenCreated");
  if (event) {
    console.log("✅ Test token created:");
    console.log("  Token Address:", event.args.token);
    console.log("  Creator:", event.args.creator);
    console.log("  Name:", event.args.name);
    console.log("  Symbol:", event.args.symbol);
    console.log("  Initial Price:", hre.ethers.utils.formatEther(event.args.initialPrice), "CHZ");
    
    // Test the bonding curve
    const SimpleCAP20TokenV2 = await hre.ethers.getContractFactory("SimpleCAP20TokenV2");
    const testToken = SimpleCAP20TokenV2.attach(event.args.token);
    
    console.log("\n💰 Testing bonding curve pricing...");
    
    // Check initial state
    const currentPrice = await testToken.getCurrentPrice();
    console.log("  Current price:", hre.ethers.utils.formatEther(currentPrice), "CHZ per token");
    
    const tokensSold = await testToken.tokensSold();
    console.log("  Tokens sold so far:", hre.ethers.utils.formatEther(tokensSold));
    
    // Calculate tokens for 1 CHZ
    const oneChz = hre.ethers.utils.parseEther("1");
    const tokensFor1CHZ = await testToken.calculateTokensFromCHZ(oneChz);
    console.log("  Tokens for 1 CHZ:", hre.ethers.utils.formatEther(tokensFor1CHZ));
    
    // Calculate CHZ needed for 100 tokens
    const oneHundredTokens = hre.ethers.utils.parseEther("100");
    const chzFor100Tokens = await testToken.calculateCHZFromTokens(oneHundredTokens);
    console.log("  CHZ for 100 tokens:", hre.ethers.utils.formatEther(chzFor100Tokens));
    
    // Test minting (this will also test price increase)
    console.log("\n🪙 Testing token minting...");
    const mintTx = await testToken.mint(oneHundredTokens, { value: chzFor100Tokens });
    await mintTx.wait();
    
    const newPrice = await testToken.getCurrentPrice();
    const newTokensSold = await testToken.tokensSold();
    console.log("  Price after minting:", hre.ethers.utils.formatEther(newPrice), "CHZ per token");
    console.log("  Total tokens sold:", hre.ethers.utils.formatEther(newTokensSold));
    
    const balance = await testToken.balanceOf(deployer.address);
    console.log("  Deployer token balance:", hre.ethers.utils.formatEther(balance));
  }

  // Save address to environment variables
  console.log("\n📝 Adding SimpleTokenLaunchpadV2 address to .env.local...");
  const fs = require("fs");
  let envContent = fs.readFileSync(".env.local", "utf8");
  
  // Add or update the V2 launchpad address
  if (envContent.includes("NEXT_PUBLIC_SIMPLE_LAUNCHPAD_V2_ADDRESS=")) {
    envContent = envContent.replace(
      /NEXT_PUBLIC_SIMPLE_LAUNCHPAD_V2_ADDRESS=.*/,
      `NEXT_PUBLIC_SIMPLE_LAUNCHPAD_V2_ADDRESS="${launchpad.address}"`
    );
  } else {
    envContent += `\nNEXT_PUBLIC_SIMPLE_LAUNCHPAD_V2_ADDRESS="${launchpad.address}"\n`;
  }
  
  fs.writeFileSync(".env.local", envContent);
  console.log("✅ .env.local updated with SimpleTokenLaunchpadV2 address");

  console.log("\n🎉 SimpleTokenLaunchpadV2 deployment completed!");
  console.log("📄 Contract address:", launchpad.address);
  console.log("🔗 Network:", hre.network.name);
  console.log("📈 Features: Simple bonding curve with dynamic pricing");
  console.log("💡 Price increases every", hre.ethers.utils.formatEther(stepSize), "tokens minted");
}

main().catch((error) => {
  console.error("❌ SimpleTokenLaunchpadV2 deployment failed:", error);
  process.exitCode = 1;
});