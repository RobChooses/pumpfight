const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Buy Function Line by Line Debug", function () {
  let factory;
  let fighterToken;
  let fighterVault;
  let owner, fighter, buyer;

  beforeEach(async function () {
    [owner, fighter, buyer] = await ethers.getSigners();

    // Deploy Factory
    const PumpFightFactory = await ethers.getContractFactory("PumpFightFactory");
    factory = await PumpFightFactory.deploy(owner.address);
    await factory.deployed();

    // Create a fighter token
    const creationFee = await factory.creationFee();
    const tx = await factory.connect(fighter).createFighterToken(
      "Test Fighter Token",
      "TFT", 
      "Token for Test Fighter",
      "https://example.com/image.jpg",
      { value: creationFee }
    );

    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === "TokenCreated");
    const tokenAddress = event.args.token;

    const FighterToken = await ethers.getContractFactory("FighterToken");
    fighterToken = FighterToken.attach(tokenAddress);
  });

  it("Should test buy function step by step with gas estimation", async function () {
    console.log("\n🔬 Testing buy function with gas estimation:");
    
    const buyAmount = ethers.utils.parseEther("1");
    
    // Test gas estimation first
    try {
      const gasEstimate = await fighterToken.connect(buyer).estimateGas.buy(0, { value: buyAmount });
      console.log("   Gas estimate:", gasEstimate.toString());
    } catch (gasError) {
      console.log("   ❌ Gas estimation failed:", gasError.message);
      
      // Look for specific error messages in gas estimation
      if (gasError.message.includes("revert")) {
        console.log("   This means the transaction would revert during execution");
      }
      
      // Try with different amounts
      try {
        const smallAmount = ethers.utils.parseEther("0.0001"); // Very small amount
        const smallGasEstimate = await fighterToken.connect(buyer).estimateGas.buy(0, { value: smallAmount });
        console.log("   Small amount gas estimate:", smallGasEstimate.toString());
      } catch (smallGasError) {
        console.log("   ❌ Even small amount gas estimation failed:", smallGasError.message);
      }
    }

    // Test the actual transaction with detailed error handling
    try {
      console.log("\n   Attempting actual transaction...");
      const tx = await fighterToken.connect(buyer).buy(0, { 
        value: buyAmount,
        gasLimit: 500000 // Set explicit gas limit
      });
      console.log("   ✅ Transaction successful!");
      
    } catch (error) {
      console.log("   ❌ Transaction failed:", error.message);
      
      // Check if it's a specific Solidity error
      if (error.data) {
        console.log("   Error data:", error.data);
      }
      
      if (error.reason) {
        console.log("   Error reason:", error.reason);
      }
      
      if (error.code) {
        console.log("   Error code:", error.code);
      }
      
      // Try to see if it's an out-of-gas error
      try {
        const tx = await fighterToken.connect(buyer).buy(0, { 
          value: buyAmount,
          gasLimit: 1000000 // Much higher gas limit
        });
        console.log("   ✅ Higher gas limit worked!");
      } catch (highGasError) {
        console.log("   ❌ Even higher gas limit failed:", highGasError.message);
      }
    }
  });

  it("Should test if the problem is in the constructor or state", async function () {
    console.log("\n🔍 Testing token state and constructor:");
    
    // Check all the basic state that should be set by constructor
    try {
      const fighter = await fighterToken.fighter();
      console.log("   Fighter address:", fighter);
      
      const vault = await fighterToken.fighterVault();
      console.log("   Vault address:", vault);
      
      const factoryAddr = await fighterToken.factory();
      console.log("   Factory address:", factoryAddr);
      
      const config = await fighterToken.config();
      console.log("   Config initial price:", ethers.utils.formatEther(config.initialPrice));
      console.log("   Config creator share:", config.creatorShare.toString());
      console.log("   Config platform fee:", config.platformFee.toString());
      
      const bondingCurve = await fighterToken.bondingCurve();
      console.log("   Bonding curve price:", ethers.utils.formatEther(bondingCurve.currentPrice));
      console.log("   Bonding curve tokens sold:", ethers.utils.formatEther(bondingCurve.tokensSold));
      
      console.log("   ✅ All state variables accessible");
      
    } catch (stateError) {
      console.log("   ❌ State access failed:", stateError.message);
    }
  });

  it("Should test if modifiers are causing the issue", async function () {
    console.log("\n🔒 Testing if modifiers are the issue:");
    
    const buyAmount = ethers.utils.parseEther("1");
    
    // Test nonReentrant - try calling buy twice quickly
    console.log("   Testing reentrancy protection...");
    
    // Test whenNotPaused
    try {
      const isPaused = await fighterToken.paused();
      console.log("   Contract paused:", isPaused);
      if (isPaused) {
        console.log("   ❌ Contract is paused!");
      } else {
        console.log("   ✅ Contract is not paused");
      }
    } catch (pauseError) {
      console.log("   ❌ Error checking pause status:", pauseError.message);
    }
    
    // Test notGraduated  
    try {
      const isGraduated = await fighterToken.isGraduated();
      console.log("   Contract graduated:", isGraduated);
      if (isGraduated) {
        console.log("   ❌ Contract is graduated!");
      } else {
        console.log("   ✅ Contract is not graduated");
      }
    } catch (gradError) {
      console.log("   ❌ Error checking graduation status:", gradError.message);
    }
    
    // Test basic requirements in buy function
    console.log("\n   Testing buy function requirements:");
    
    // msg.value > 0
    console.log("   Buy amount > 0:", buyAmount.gt(0));
    
    // calculateTokensFromCHZ works
    try {
      const expectedTokens = await fighterToken.calculateTokensFromCHZ(buyAmount);
      console.log("   Expected tokens:", ethers.utils.formatEther(expectedTokens));
      console.log("   Expected tokens > 0:", expectedTokens.gt(0));
    } catch (calcError) {
      console.log("   ❌ calculateTokensFromCHZ failed:", calcError.message);
    }
    
    // minTokensOut = 0, so slippage should pass
    console.log("   Slippage protection (minTokensOut = 0): should pass");
    
    // max supply check
    try {
      const config = await fighterToken.config();
      const bondingCurve = await fighterToken.bondingCurve();
      const expectedTokens = await fighterToken.calculateTokensFromCHZ(buyAmount);
      
      const afterPurchase = bondingCurve.tokensSold.add(expectedTokens);
      const withinMaxSupply = afterPurchase.lte(config.maxSupply);
      
      console.log("   Max supply:", ethers.utils.formatEther(config.maxSupply));
      console.log("   After purchase would be:", ethers.utils.formatEther(afterPurchase));
      console.log("   Within max supply:", withinMaxSupply);
      
    } catch (supplyError) {
      console.log("   ❌ Max supply check failed:", supplyError.message);
    }
  });
});