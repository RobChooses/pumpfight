const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Buy Without Fees Test", function () {
  let factory;
  let fighterToken;
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

  it("Should test buying with 0% fees temporarily", async function () {
    console.log("\n🧪 Testing token purchase step by step:");
    
    const buyAmount = ethers.utils.parseEther("1");
    
    // First let's check if the issue is with fee calculation or fee transfer
    console.log("1. Checking fee calculations:");
    const config = await fighterToken.config();
    const fighterFee = buyAmount.mul(config.creatorShare).div(10000);
    const platformFee = buyAmount.mul(config.platformFee).div(10000);
    const reserveAmount = buyAmount.sub(fighterFee).sub(platformFee);
    
    console.log("   Total buy amount:", ethers.utils.formatEther(buyAmount));
    console.log("   Fighter fee (5%):", ethers.utils.formatEther(fighterFee));
    console.log("   Platform fee (2.5%):", ethers.utils.formatEther(platformFee));
    console.log("   Reserve amount:", ethers.utils.formatEther(reserveAmount));
    
    // Let's test if the issue is SafeMath operations
    console.log("\n2. Testing SafeMath operations:");
    try {
      const testSub = buyAmount.sub(fighterFee).sub(platformFee);
      console.log("   ✅ SafeMath subtraction works:", ethers.utils.formatEther(testSub));
    } catch (mathError) {
      console.log("   ❌ SafeMath error:", mathError.message);
    }
    
    // Test interface call to factory
    console.log("\n3. Testing factory interface call:");
    try {
      const factoryInterface = await ethers.getContractAt("PumpFightFactory", await fighterToken.factory());
      const treasuryAddr = await factoryInterface.platformTreasury();
      console.log("   ✅ Platform treasury call works:", treasuryAddr);
    } catch (interfaceError) {
      console.log("   ❌ Interface call failed:", interfaceError.message);
    }
    
    // Try the actual buy
    console.log("\n4. Attempting token purchase:");
    try {
      const tx = await fighterToken.connect(buyer).buy(0, { value: buyAmount });
      await tx.wait();
      console.log("   ✅ Purchase successful!");
      
      const tokenBalance = await fighterToken.balanceOf(buyer.address);
      console.log("   Tokens received:", ethers.utils.formatEther(tokenBalance));
      
      const newReserveBalance = (await fighterToken.bondingCurve()).reserveBalance;
      console.log("   New reserve balance:", ethers.utils.formatEther(newReserveBalance));
      
    } catch (error) {
      console.log("   ❌ Purchase failed:", error.message);
      
      // Let's manually trace through what the buy function should do
      console.log("\n5. Manual trace of buy function:");
      
      try {
        console.log("   Checking msg.value > 0:", buyAmount.gt(0));
        
        const tokensToMint = await fighterToken.calculateTokensFromCHZ(buyAmount);
        console.log("   calculateTokensFromCHZ result:", ethers.utils.formatEther(tokensToMint));
        
        console.log("   tokensToMint >= minTokensOut (0):", tokensToMint.gte(0));
        
        const bondingCurve = await fighterToken.bondingCurve();
        const afterPurchase = bondingCurve.tokensSold.add(tokensToMint);
        const withinSupply = afterPurchase.lte(config.maxSupply);
        console.log("   Within max supply:", withinSupply);
        console.log("   After purchase tokens:", ethers.utils.formatEther(afterPurchase));
        console.log("   Max supply:", ethers.utils.formatEther(config.maxSupply));
        
        console.log("\n   All requirements should pass, so issue is in execution");
        
      } catch (traceError) {
        console.log("   ❌ Manual trace failed:", traceError.message);
      }
    }
  });
});