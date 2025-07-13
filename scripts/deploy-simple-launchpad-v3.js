const hre = require("hardhat");
require("dotenv").config();
require("dotenv").config({ path: ".env.local" });

async function main() {
  console.log("🚀 Starting SimpleTokenLaunchpadV3 deployment to", hre.network.name);
  console.log("🔧 This version has FIXED calculations!");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", hre.ethers.utils.formatEther(await deployer.getBalance()), "CHZ");

  // Deploy SimpleTokenLaunchpadV3
  console.log("\n🏭 Deploying SimpleTokenLaunchpadV3...");
  const SimpleTokenLaunchpadV3 = await hre.ethers.getContractFactory("SimpleTokenLaunchpadV3");
  const launchpad = await SimpleTokenLaunchpadV3.deploy();
  await launchpad.deployed();
  console.log("✅ SimpleTokenLaunchpadV3 deployed to:", launchpad.address);

  // Show default parameters
  console.log("\n⚙️ Default Bonding Curve Parameters (FIXED):");
  const [initialPrice, priceIncrement, stepSize] = await launchpad.getDefaultParams();
  console.log("  Initial Price:", hre.ethers.utils.formatEther(initialPrice), "CHZ per token");
  console.log("  Price Increment:", hre.ethers.utils.formatEther(priceIncrement), "CHZ per step");
  console.log("  Step Size:", hre.ethers.utils.formatEther(stepSize), "tokens per step");

  // Test creating a token with default parameters
  console.log("\n🧪 Testing token creation with FIXED calculations...");
  const tx = await launchpad.createSimpleToken("Fixed Bonding Token", "FBT");
  const receipt = await tx.wait();
  
  const event = receipt.events.find(e => e.event === "SimpleTokenCreated");
  if (event) {
    console.log("✅ Test token created:");
    console.log("  Token Address:", event.args.token);
    console.log("  Creator:", event.args.creator);
    console.log("  Name:", event.args.name);
    console.log("  Symbol:", event.args.symbol);
    console.log("  Initial Price:", hre.ethers.utils.formatEther(event.args.initialPrice), "CHZ per token");
    
    // Test the FIXED bonding curve
    const SimpleCAP20TokenV3 = await hre.ethers.getContractFactory("SimpleCAP20TokenV3");
    const testToken = SimpleCAP20TokenV3.attach(event.args.token);
    
    console.log("\n💰 Testing FIXED bonding curve pricing...");
    
    // Check initial state
    const [currentPrice, tokensSold, currentStep, nextStepAt] = await testToken.getBondingCurveState();
    console.log("  Current price:", hre.ethers.utils.formatEther(currentPrice), "CHZ per token");
    console.log("  Tokens sold so far:", hre.ethers.utils.formatEther(tokensSold));
    console.log("  Current step:", currentStep.toString());
    console.log("  Next step at:", hre.ethers.utils.formatEther(nextStepAt), "tokens");
    
    // Test calculations - these should be CORRECT now
    console.log("\n🧮 Testing FIXED calculations:");
    
    // Test 1: 1 CHZ should buy 1000 tokens at 0.001 CHZ per token
    const oneChz = hre.ethers.utils.parseEther("1");
    const tokensFor1CHZ = await testToken.calculateTokensFromCHZ(oneChz);
    console.log("  Tokens for 1 CHZ:", hre.ethers.utils.formatEther(tokensFor1CHZ), "(should be 1000)");
    
    // Test 2: 100 tokens should cost 0.1 CHZ at 0.001 CHZ per token
    const oneHundredTokens = hre.ethers.utils.parseEther("100");
    const chzFor100Tokens = await testToken.calculateCHZFromTokens(oneHundredTokens);
    console.log("  CHZ for 100 tokens:", hre.ethers.utils.formatEther(chzFor100Tokens), "(should be 0.1)");
    
    // Test 3: 1000 tokens should cost 1 CHZ at 0.001 CHZ per token
    const oneThousandTokens = hre.ethers.utils.parseEther("1000");
    const chzFor1000Tokens = await testToken.calculateCHZFromTokens(oneThousandTokens);
    console.log("  CHZ for 1000 tokens:", hre.ethers.utils.formatEther(chzFor1000Tokens), "(should be 1.0)");
    
    // Test minting with CORRECT amounts
    console.log("\n🪙 Testing token minting with FIXED calculations...");
    
    // Mint 500 tokens (should cost 0.5 CHZ and not trigger price increase)
    const fiveHundredTokens = hre.ethers.utils.parseEther("500");
    const chzFor500Tokens = await testToken.calculateCHZFromTokens(fiveHundredTokens);
    console.log("  Minting 500 tokens for:", hre.ethers.utils.formatEther(chzFor500Tokens), "CHZ");
    
    const mintTx = await testToken.mint(fiveHundredTokens, { value: chzFor500Tokens });
    await mintTx.wait();
    
    const [newPrice, newTokensSold, newStep, newNextStepAt] = await testToken.getBondingCurveState();
    console.log("  ✅ After minting 500 tokens:");
    console.log("    Price:", hre.ethers.utils.formatEther(newPrice), "CHZ per token (should still be 0.001)");
    console.log("    Tokens sold:", hre.ethers.utils.formatEther(newTokensSold), "(should be 500)");
    console.log("    Current step:", newStep.toString(), "(should still be 0)");
    
    const balance = await testToken.balanceOf(deployer.address);
    console.log("    Deployer token balance:", hre.ethers.utils.formatEther(balance));
    
    // Now mint 600 more tokens to trigger price increase (total 1100 = crosses 1000 step)
    console.log("\n  Minting 600 more tokens to trigger price increase...");
    const sixHundredTokens = hre.ethers.utils.parseEther("600");
    const chzFor600Tokens = await testToken.calculateCHZFromTokens(sixHundredTokens);
    console.log("  Cost for 600 tokens at current price:", hre.ethers.utils.formatEther(chzFor600Tokens), "CHZ");
    
    const mintTx2 = await testToken.mint(sixHundredTokens, { value: chzFor600Tokens });
    await mintTx2.wait();
    
    const [finalPrice, finalTokensSold, finalStep, finalNextStepAt] = await testToken.getBondingCurveState();
    console.log("  ✅ After minting 600 more tokens (total 1100):");
    console.log("    Price:", hre.ethers.utils.formatEther(finalPrice), "CHZ per token (should be 0.0011)");
    console.log("    Tokens sold:", hre.ethers.utils.formatEther(finalTokensSold), "(should be 1100)");
    console.log("    Current step:", finalStep.toString(), "(should be 1)");
    console.log("    Next step at:", hre.ethers.utils.formatEther(finalNextStepAt), "tokens (should be 2000)");
  }

  // Save address to environment variables
  console.log("\n📝 Adding SimpleTokenLaunchpadV3 address to .env.local...");
  const fs = require("fs");
  let envContent = fs.readFileSync(".env.local", "utf8");
  
  // Add or update the V3 launchpad address
  if (envContent.includes("NEXT_PUBLIC_SIMPLE_LAUNCHPAD_V3_ADDRESS=")) {
    envContent = envContent.replace(
      /NEXT_PUBLIC_SIMPLE_LAUNCHPAD_V3_ADDRESS=.*/,
      `NEXT_PUBLIC_SIMPLE_LAUNCHPAD_V3_ADDRESS="${launchpad.address}"`
    );
  } else {
    envContent += `\nNEXT_PUBLIC_SIMPLE_LAUNCHPAD_V3_ADDRESS="${launchpad.address}"\n`;
  }
  
  fs.writeFileSync(".env.local", envContent);
  console.log("✅ .env.local updated with SimpleTokenLaunchpadV3 address");

  console.log("\n🎉 SimpleTokenLaunchpadV3 deployment completed!");
  console.log("📄 Contract address:", launchpad.address);
  console.log("🔗 Network:", hre.network.name);
  console.log("🔧 Features: FIXED bonding curve with correct calculations");
  console.log("📈 Price increases every", hre.ethers.utils.formatEther(stepSize), "tokens minted");
  console.log("💡 Starting at", hre.ethers.utils.formatEther(initialPrice), "CHZ per token");
}

main().catch((error) => {
  console.error("❌ SimpleTokenLaunchpadV3 deployment failed:", error);
  process.exitCode = 1;
});