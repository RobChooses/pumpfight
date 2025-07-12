const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Simple Token Live Test", function () {
  // This test connects to the deployed contract on testnet
  const SIMPLE_LAUNCHPAD_ADDRESS = process.env.NEXT_PUBLIC_SIMPLE_LAUNCHPAD_ADDRESS;
  
  it("Should verify deployed SimpleTokenLaunchpad works", async function () {
    if (!SIMPLE_LAUNCHPAD_ADDRESS) {
      console.log("❌ NEXT_PUBLIC_SIMPLE_LAUNCHPAD_ADDRESS not found in environment");
      return;
    }

    console.log("\n🔍 Testing deployed SimpleTokenLaunchpad at:", SIMPLE_LAUNCHPAD_ADDRESS);
    
    const [deployer] = await ethers.getSigners();
    console.log("  Using account:", deployer.address);
    
    // Connect to deployed contract
    const SimpleTokenLaunchpad = await ethers.getContractFactory("SimpleTokenLaunchpad");
    const launchpad = SimpleTokenLaunchpad.attach(SIMPLE_LAUNCHPAD_ADDRESS);
    
    try {
      // Test getting total tokens (should work without gas)
      const totalTokens = await launchpad.getTotalTokens();
      console.log("  ✅ Total tokens created so far:", totalTokens.toString());
      
      // Test getting creator tokens for the deployer
      const creatorTokens = await launchpad.getCreatorTokens(deployer.address);
      console.log("  ✅ Deployer's tokens:", creatorTokens.length);
      
      if (creatorTokens.length > 0) {
        console.log("  📄 First token address:", creatorTokens[0]);
        
        // Test connecting to the token
        const SimpleCAP20Token = await ethers.getContractFactory("SimpleCAP20Token");
        const token = SimpleCAP20Token.attach(creatorTokens[0]);
        
        const name = await token.name();
        const symbol = await token.symbol();
        const creator = await token.creator();
        
        console.log("  📄 Token details:");
        console.log("    Name:", name);
        console.log("    Symbol:", symbol);
        console.log("    Creator:", creator);
        
        // Check deployer's token balance
        const balance = await token.balanceOf(deployer.address);
        console.log("    Deployer balance:", ethers.utils.formatEther(balance), "tokens");
      }
      
      console.log("  ✅ All contract interactions successful!");
      
    } catch (error) {
      console.log("  ❌ Contract interaction failed:", error.message);
      throw error;
    }
  });
});