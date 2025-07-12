const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Token Buying Debug", function () {
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
    const vaultAddress = event.args.vault;

    const FighterToken = await ethers.getContractFactory("FighterToken");
    fighterToken = FighterToken.attach(tokenAddress);

    const FighterVault = await ethers.getContractFactory("FighterVault");
    fighterVault = FighterVault.attach(vaultAddress);
  });

  it("Should debug step by step what happens during buy", async function () {
    console.log("\n🔍 Step-by-step debugging of token purchase:");
    
    const buyAmount = ethers.utils.parseEther("1"); // 1 CHZ
    
    console.log("1. Initial state:");
    console.log("   Buyer balance:", ethers.utils.formatEther(await ethers.provider.getBalance(buyer.address)));
    console.log("   Token price:", ethers.utils.formatEther(await fighterToken.getCurrentPrice()));
    console.log("   Tokens sold:", ethers.utils.formatEther((await fighterToken.bondingCurve()).tokensSold));
    
    // Test sending CHZ directly to vault
    console.log("\n2. Testing direct CHZ transfer to vault:");
    try {
      const testAmount = ethers.utils.parseEther("0.1");
      await buyer.sendTransaction({
        to: fighterVault.address,
        value: testAmount
      });
      console.log("   ✅ Direct transfer to vault successful");
      
      const vaultBalance = await ethers.provider.getBalance(fighterVault.address);
      console.log("   Vault balance after:", ethers.utils.formatEther(vaultBalance));
      
      const rewardPool = await fighterVault.rewardPool();
      console.log("   Reward pool:", ethers.utils.formatEther(rewardPool));
    } catch (error) {
      console.log("   ❌ Direct transfer failed:", error.message);
    }
    
    // Test fee calculation
    console.log("\n3. Testing fee calculation:");
    const config = await fighterToken.config();
    const fighterFee = buyAmount.mul(config.creatorShare).div(10000);
    const platformFee = buyAmount.mul(config.platformFee).div(10000);
    console.log("   Buy amount:", ethers.utils.formatEther(buyAmount));
    console.log("   Fighter fee (5%):", ethers.utils.formatEther(fighterFee));
    console.log("   Platform fee (2.5%):", ethers.utils.formatEther(platformFee));
    console.log("   Remaining for curve:", ethers.utils.formatEther(buyAmount.sub(fighterFee).sub(platformFee)));
    
    // Test platform treasury transfer
    console.log("\n4. Testing platform treasury transfer:");
    try {
      const treasuryAddr = await factory.platformTreasury();
      console.log("   Platform treasury:", treasuryAddr);
      const treasuryBalanceBefore = await ethers.provider.getBalance(treasuryAddr);
      console.log("   Treasury balance before:", ethers.utils.formatEther(treasuryBalanceBefore));
      
      // Try manual transfer to treasury
      await buyer.sendTransaction({
        to: treasuryAddr,
        value: platformFee
      });
      console.log("   ✅ Manual treasury transfer successful");
    } catch (error) {
      console.log("   ❌ Treasury transfer failed:", error.message);
    }

    // Try a very minimal buy operation
    console.log("\n5. Testing token purchase with minimal logging:");
    try {
      // Check if contract is paused
      const isPaused = await fighterToken.paused();
      console.log("   Contract paused:", isPaused);
      
      // Check if graduated
      const isGraduated = await fighterToken.isGraduated();
      console.log("   Contract graduated:", isGraduated);
      
      // Check slippage protection
      const expectedTokens = await fighterToken.calculateTokensFromCHZ(buyAmount);
      console.log("   Expected tokens:", ethers.utils.formatEther(expectedTokens));
      
      // Check max supply constraint
      const maxSupply = config.maxSupply;
      const tokensSold = (await fighterToken.bondingCurve()).tokensSold;
      console.log("   Max supply:", ethers.utils.formatEther(maxSupply));
      console.log("   Tokens sold:", ethers.utils.formatEther(tokensSold));
      console.log("   Can mint:", tokensSold.add(expectedTokens).lte(maxSupply));
      
      console.log("\n   Attempting purchase...");
      const tx = await fighterToken.connect(buyer).buy(0, { value: buyAmount });
      await tx.wait();
      console.log("   ✅ Purchase successful!");
      
    } catch (error) {
      console.log("   ❌ Purchase failed:", error.message);
      
      // Try to understand which exact line is failing
      console.log("\n6. Trying to isolate the failure:");
      
      // Test individual components that might fail
      try {
        // Test if SafeMath operations work
        const testCalc = await fighterToken.calculateTokensFromCHZ(buyAmount);
        console.log("   ✅ calculateTokensFromCHZ works:", ethers.utils.formatEther(testCalc));
      } catch (calcError) {
        console.log("   ❌ calculateTokensFromCHZ failed:", calcError.message);
      }
      
      try {
        // Test a smaller amount
        const smallAmount = ethers.utils.parseEther("0.001");
        await fighterToken.connect(buyer).buy(0, { value: smallAmount });
        console.log("   ✅ Small amount purchase works");
      } catch (smallError) {
        console.log("   ❌ Small amount also fails:", smallError.message);
      }
    }
  });
});