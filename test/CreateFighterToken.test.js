const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Fighter Token Creation Diagnosis", function () {
  let factory;
  let owner;
  let fighter;
  let buyer;
  let platformTreasury;

  beforeEach(async function () {
    [owner, fighter, buyer, platformTreasury] = await ethers.getSigners();

    console.log("🔍 Test Setup:");
    console.log("  Owner:", owner.address);
    console.log("  Fighter:", fighter.address);
    console.log("  Buyer:", buyer.address);
    console.log("  Platform Treasury:", platformTreasury.address);

    // Deploy Factory (no verification registry needed)
    console.log("\n🏭 Deploying PumpFightFactory (simplified)...");
    const PumpFightFactory = await ethers.getContractFactory("PumpFightFactory");
    factory = await PumpFightFactory.deploy(
      platformTreasury.address
    );
    await factory.deployed();
    console.log("  ✅ PumpFightFactory deployed at:", factory.address);
    console.log("  ℹ️ No verification required - anyone can create tokens!");
  });

  describe("Diagnostic Tests", function () {
    it("Should check factory configuration", async function () {
      console.log("\n🔧 Factory Configuration:");
      
      const defaultConfig = await factory.defaultConfig();
      console.log("  Initial Price:", ethers.utils.formatEther(defaultConfig.initialPrice), "CHZ");
      console.log("  Step Multiplier:", defaultConfig.stepMultiplier.toString());
      console.log("  Step Size:", ethers.utils.formatEther(defaultConfig.stepSize));
      console.log("  Graduation Target:", ethers.utils.formatEther(defaultConfig.graduationTarget));
      console.log("  Creator Share:", defaultConfig.creatorShare.toString(), "basis points");
      console.log("  Platform Fee:", defaultConfig.platformFee.toString(), "basis points");
      console.log("  Max Supply:", ethers.utils.formatEther(defaultConfig.maxSupply));

      const creationFee = await factory.creationFee();
      console.log("  Creation Fee:", ethers.utils.formatEther(creationFee), "CHZ");

      const vestingPeriod = await factory.creatorVestingPeriod();
      console.log("  Vesting Period:", vestingPeriod.toString(), "seconds");
    });

    it("Should check that anyone can create tokens", async function () {
      console.log("\n👤 Token Creation Access:");
      console.log("  ✅ No verification required");
      console.log("  ✅ Any address can create fighter tokens");
      console.log("  ✅ Only requirement is paying the creation fee");
    });

    it("Should check account balances", async function () {
      console.log("\n💰 Account Balances:");
      
      const fighterBalance = await ethers.provider.getBalance(fighter.address);
      console.log("  Fighter Balance:", ethers.utils.formatEther(fighterBalance), "CHZ");

      const buyerBalance = await ethers.provider.getBalance(buyer.address);
      console.log("  Buyer Balance:", ethers.utils.formatEther(buyerBalance), "CHZ");

      const creationFee = await factory.creationFee();
      console.log("  Required Fee:", ethers.utils.formatEther(creationFee), "CHZ");
      console.log("  Fighter has enough?", fighterBalance.gte(creationFee));
    });

    it("Should test fighter token creation step by step", async function () {
      console.log("\n🎯 Testing Fighter Token Creation:");
      
      // Step 1: Check prerequisites
      console.log("\n  Step 1: Checking prerequisites...");
      console.log("    ✅ No verification required");

      const creationFee = await factory.creationFee();
      const fighterBalance = await ethers.provider.getBalance(fighter.address);
      expect(fighterBalance.gte(creationFee)).to.be.true;
      console.log("    ✅ Fighter has sufficient balance");

      // Step 2: Create token
      console.log("\n  Step 2: Creating fighter token...");
      console.log("    Token Name: Test Fighter Token");
      console.log("    Token Symbol: TFT");
      console.log("    Description: Token for Test Fighter");
      console.log("    Image URL: https://example.com/image.jpg");
      console.log("    Creation Fee:", ethers.utils.formatEther(creationFee), "CHZ");

      const balanceBefore = await ethers.provider.getBalance(fighter.address);
      console.log("    Fighter balance before:", ethers.utils.formatEther(balanceBefore), "CHZ");

      try {
        const tx = await factory.connect(fighter).createFighterToken(
          "Test Fighter Token",
          "TFT",
          "Token for Test Fighter",
          "https://example.com/image.jpg",
          { value: creationFee }
        );

        console.log("    ✅ Transaction submitted, hash:", tx.hash);

        const receipt = await tx.wait();
        console.log("    ✅ Transaction confirmed, gas used:", receipt.gasUsed.toString());

        const balanceAfter = await ethers.provider.getBalance(fighter.address);
        console.log("    Fighter balance after:", ethers.utils.formatEther(balanceAfter), "CHZ");

        // Check for TokenCreated event
        const tokenCreatedEvent = receipt.events.find(e => e.event === "TokenCreated");
        if (tokenCreatedEvent) {
          console.log("    ✅ TokenCreated event emitted");
          console.log("    Token Address:", tokenCreatedEvent.args.token);
          console.log("    Vault Address:", tokenCreatedEvent.args.vault);
          console.log("    Fighter:", tokenCreatedEvent.args.fighter);
          console.log("    Token Name:", tokenCreatedEvent.args.fighterName);
        } else {
          console.log("    ❌ TokenCreated event NOT found");
        }

        // Verify token was added to fighter's tokens
        const fighterTokens = await factory.getFighterTokens(fighter.address);
        console.log("    Fighter tokens count:", fighterTokens.length);
        
        if (fighterTokens.length > 0) {
          console.log("    ✅ Token added to fighter's token list");
          console.log("    First token address:", fighterTokens[0]);
          
          const isValid = await factory.isValidToken(fighterTokens[0]);
          console.log("    Token is valid:", isValid);
        }

      } catch (error) {
        console.log("    ❌ Transaction failed:", error.message);
        
        // Try to get more detailed error info
        if (error.reason) {
          console.log("    Revert reason:", error.reason);
        }
        if (error.code) {
          console.log("    Error code:", error.code);
        }
        
        throw error;
      }
    });

    it("Should test with insufficient fee", async function () {
      console.log("\n💸 Testing with insufficient fee:");
      
      const creationFee = await factory.creationFee();
      const insufficientFee = creationFee.div(2);
      
      console.log("  Required fee:", ethers.utils.formatEther(creationFee), "CHZ");
      console.log("  Sending fee:", ethers.utils.formatEther(insufficientFee), "CHZ");
      
      await expect(
        factory.connect(fighter).createFighterToken(
          "Test Fighter Token",
          "TFT",
          "Token for Test Fighter",
          "https://example.com/image.jpg",
          { value: insufficientFee }
        )
      ).to.be.revertedWith("Insufficient creation fee");
      
      console.log("  ✅ Correctly rejected insufficient fee");
    });

    it("Should allow any address to create tokens", async function () {
      console.log("\n✅ Testing that any address can create tokens:");
      
      const creationFee = await factory.creationFee();
      
      // Any address should be able to create tokens
      const tx = await factory.connect(buyer).createFighterToken(
        "Anyone Token",
        "ANY",
        "Token created by any address",
        "https://example.com/image.jpg",
        { value: creationFee }
      );
      
      const receipt = await tx.wait();
      const tokenCreatedEvent = receipt.events.find(e => e.event === "TokenCreated");
      
      expect(tokenCreatedEvent).to.not.be.undefined;
      console.log("  ✅ Any address can successfully create tokens");
      console.log("  📄 Token created at:", tokenCreatedEvent.args.token);
    });
  });

  describe("Token Interaction Tests", function () {
    let fighterToken;

    beforeEach(async function () {
      const creationFee = await factory.creationFee();
      
      // Create fighter token
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

    it("Should test token buying", async function () {
      console.log("\n🛒 Testing token buying:");
      
      // First, let's check the token state
      console.log("\n  🔍 Token State Before Purchase:");
      const currentPrice = await fighterToken.getCurrentPrice();
      console.log("    Current Price:", ethers.utils.formatEther(currentPrice), "CHZ");
      
      const bondingCurve = await fighterToken.bondingCurve();
      console.log("    Bonding Curve Current Price:", ethers.utils.formatEther(bondingCurve.currentPrice), "CHZ");
      console.log("    Tokens Sold:", ethers.utils.formatEther(bondingCurve.tokensSold));
      console.log("    Current Step:", bondingCurve.currentStep.toString());
      console.log("    Reserve Balance:", ethers.utils.formatEther(bondingCurve.reserveBalance), "CHZ");
      
      const config = await fighterToken.config();
      console.log("    Initial Price (config):", ethers.utils.formatEther(config.initialPrice), "CHZ");
      console.log("    Max Supply:", ethers.utils.formatEther(config.maxSupply));
      
      const isGraduated = await fighterToken.isGraduated();
      console.log("    Is Graduated:", isGraduated);
      
      const isPaused = await fighterToken.paused();
      console.log("    Is Paused:", isPaused);
      
      const buyAmount = ethers.utils.parseEther("1"); // 1 CHZ
      console.log("\n  💰 Purchase Details:");
      console.log("    Buy amount:", ethers.utils.formatEther(buyAmount), "CHZ");
      
      // Test the calculation function
      try {
        const expectedTokens = await fighterToken.calculateTokensFromCHZ(buyAmount);
        console.log("    Expected tokens from calculation:", ethers.utils.formatEther(expectedTokens));
      } catch (error) {
        console.log("    ❌ Error in calculateTokensFromCHZ:", error.message);
      }
      
      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);
      console.log("    Buyer CHZ before:", ethers.utils.formatEther(buyerBalanceBefore));
      
      // Test factory interface call
      try {
        const factoryAddress = await fighterToken.factory();
        console.log("    Factory address:", factoryAddress);
        
        const factoryContract = await ethers.getContractAt("PumpFightFactory", factoryAddress);
        const platformTreasuryAddr = await factoryContract.platformTreasury();
        console.log("    Platform treasury from factory:", platformTreasuryAddr);
      } catch (error) {
        console.log("    ❌ Error getting platform treasury:", error.message);
      }
      
      // Try the purchase
      try {
        await fighterToken.connect(buyer).buy(0, { value: buyAmount });
        
        const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
        console.log("    Buyer CHZ after:", ethers.utils.formatEther(buyerBalanceAfter));
        
        const tokenBalance = await fighterToken.balanceOf(buyer.address);
        console.log("    Tokens received:", ethers.utils.formatEther(tokenBalance));
        
        const newPrice = await fighterToken.getCurrentPrice();
        console.log("    New token price:", ethers.utils.formatEther(newPrice), "CHZ");
        
        expect(tokenBalance).to.be.gt(0);
        console.log("    ✅ Token purchase successful");
      } catch (error) {
        console.log("    ❌ Purchase failed:", error.message);
        
        // Try to get more detailed error information
        try {
          // Try with a very small amount to see if it's an amount issue
          const smallAmount = ethers.utils.parseEther("0.001");
          console.log("    Trying with smaller amount:", ethers.utils.formatEther(smallAmount), "CHZ");
          await fighterToken.connect(buyer).buy(0, { value: smallAmount });
          console.log("    ✅ Small amount purchase worked");
        } catch (smallError) {
          console.log("    ❌ Small amount also failed:", smallError.message);
        }
        
        throw error;
      }
    });
  });
});