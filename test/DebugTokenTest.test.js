const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Debug Token Test", function () {
  let factory;
  let fighterToken;
  let owner, fighter, buyer;

  beforeEach(async function () {
    [owner, fighter, buyer] = await ethers.getSigners();

    // Deploy Factory
    const PumpFightFactory = await ethers.getContractFactory("PumpFightFactory");
    factory = await PumpFightFactory.deploy(owner.address);
    await factory.deployed();

    // Deploy debug token directly (bypass factory for now)
    const FighterTokenDebug = await ethers.getContractFactory("FighterTokenDebug");
    
    // Create a mock vault address
    const mockVault = ethers.Wallet.createRandom().address;
    
    fighterToken = await FighterTokenDebug.deploy(
      "Debug Fighter Token",
      "DEBUG",
      fighter.address,
      mockVault,
      factory.address,
      ethers.utils.parseEther("0.0005"), // initialPrice
      2, // stepMultiplier
      ethers.utils.parseEther("50000"), // stepSize
      ethers.utils.parseEther("300000"), // graduationTarget
      500, // creatorShare (5%)
      250, // platformFee (2.5%)
      ethers.utils.parseEther("10000000"), // maxSupply
      "Debug token for testing",
      "https://example.com/debug.jpg"
    );
    await fighterToken.deployed();
  });

  it("Should trace the buy function execution with debug events", async function () {
    console.log("\n🔬 Debug token test with detailed event logging:");
    
    const buyAmount = ethers.utils.parseEther("1");
    
    console.log("   Buy amount:", ethers.utils.formatEther(buyAmount));
    console.log("   Token address:", fighterToken.address);
    console.log("   Buyer address:", buyer.address);
    
    try {
      const tx = await fighterToken.connect(buyer).buy(0, { value: buyAmount });
      const receipt = await tx.wait();
      
      console.log("   ✅ Transaction successful!");
      console.log("   Gas used:", receipt.gasUsed.toString());
      
      // Print all debug events
      const debugEvents = receipt.events.filter(e => e.event === "DebugStep");
      console.log("\n   📊 Debug Steps:");
      debugEvents.forEach((event, index) => {
        const step = event.args.step;
        const value = ethers.utils.formatEther(event.args.value);
        console.log(`   ${index + 1}. ${step}: ${value}`);
      });
      
      // Check final token balance
      const tokenBalance = await fighterToken.balanceOf(buyer.address);
      console.log("\n   Final token balance:", ethers.utils.formatEther(tokenBalance));
      
    } catch (error) {
      console.log("   ❌ Transaction failed:", error.message);
      
      // Try to get the revert reason if possible
      if (error.data) {
        console.log("   Error data:", error.data);
      }
      
      // Check if any events were emitted before failure
      try {
        const filter = fighterToken.filters.DebugStep();
        const events = await fighterToken.queryFilter(filter);
        if (events.length > 0) {
          console.log("\n   📊 Debug steps before failure:");
          events.forEach((event, index) => {
            const step = event.args.step;
            const value = ethers.utils.formatEther(event.args.value);
            console.log(`   ${index + 1}. ${step}: ${value}`);
          });
        } else {
          console.log("\n   No debug events found - failure was immediate");
        }
      } catch (queryError) {
        console.log("   Could not query debug events:", queryError.message);
      }
    }
  });
});