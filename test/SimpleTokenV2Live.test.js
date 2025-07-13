const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Simple Token V2 Live Test", function () {
  // This test connects to the deployed V2 contract on testnet
  const SIMPLE_LAUNCHPAD_V2_ADDRESS = "0x1fA10232a6DC953341ce393a34bd3dC82C098b43";
  
  it("Should verify deployed SimpleTokenLaunchpadV2 works", async function () {
    console.log("\n🔍 Testing deployed SimpleTokenLaunchpadV2 at:", SIMPLE_LAUNCHPAD_V2_ADDRESS);
    
    const [deployer] = await ethers.getSigners();
    console.log("  Using account:", deployer.address);
    
    // Connect to deployed contract
    const SimpleTokenLaunchpadV2 = await ethers.getContractFactory("SimpleTokenLaunchpadV2");
    const launchpad = SimpleTokenLaunchpadV2.attach(SIMPLE_LAUNCHPAD_V2_ADDRESS);
    
    try {
      // Test getting default parameters
      const [initialPrice, priceIncrement, stepSize] = await launchpad.getDefaultParams();
      console.log("  ✅ Default Parameters:");
      console.log("    Initial Price:", ethers.utils.formatEther(initialPrice), "CHZ");
      console.log("    Price Increment:", ethers.utils.formatEther(priceIncrement), "CHZ per step");
      console.log("    Step Size:", ethers.utils.formatEther(stepSize), "tokens");
      
      // Test getting total tokens
      const totalTokens = await launchpad.getTotalTokens();
      console.log("  ✅ Total tokens created so far:", totalTokens.toString());
      
      // Test getting creator tokens for the deployer
      const creatorTokens = await launchpad.getCreatorTokens(deployer.address);
      console.log("  ✅ Deployer's tokens:", creatorTokens.length);
      
      if (creatorTokens.length > 0) {
        console.log("  📄 Testing existing token at:", creatorTokens[0]);
        
        // Test connecting to the V2 token
        const SimpleCAP20TokenV2 = await ethers.getContractFactory("SimpleCAP20TokenV2");
        const token = SimpleCAP20TokenV2.attach(creatorTokens[0]);
        
        const name = await token.name();
        const symbol = await token.symbol();
        const creator = await token.creator();
        const currentPrice = await token.getCurrentPrice();
        const tokensSold = await token.tokensSold();
        
        console.log("  📄 Token details:");
        console.log("    Name:", name);
        console.log("    Symbol:", symbol);
        console.log("    Creator:", creator);
        console.log("    Current Price:", ethers.utils.formatEther(currentPrice), "CHZ per token");
        console.log("    Tokens Sold:", ethers.utils.formatEther(tokensSold));
        
        // Test price calculations
        const oneToken = ethers.utils.parseEther("1");
        const chzFor1Token = await token.calculateCHZFromTokens(oneToken);
        console.log("    CHZ for 1 token:", ethers.utils.formatEther(chzFor1Token), "CHZ");
        
        const oneChz = ethers.utils.parseEther("1");
        const tokensFor1CHZ = await token.calculateTokensFromCHZ(oneChz);
        console.log("    Tokens for 1 CHZ:", ethers.utils.formatEther(tokensFor1CHZ));
        
        // Check deployer's token balance
        const balance = await token.balanceOf(deployer.address);
        console.log("    Deployer balance:", ethers.utils.formatEther(balance), "tokens");
      }
      
      console.log("  ✅ All V2 contract interactions successful!");
      
    } catch (error) {
      console.log("  ❌ Contract interaction failed:", error.message);
      throw error;
    }
  });
});