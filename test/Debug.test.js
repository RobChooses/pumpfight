const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Debug", function () {
  let verificationRegistry;
  let factory;
  let fighterToken;
  let fighterVault;
  let owner;
  let fighter;
  let buyer;

  beforeEach(async function () {
    [owner, fighter, buyer] = await ethers.getSigners();

    // Deploy VerificationRegistry
    const VerificationRegistry = await ethers.getContractFactory("VerificationRegistry");
    verificationRegistry = await VerificationRegistry.deploy();
    await verificationRegistry.deployed();

    // Deploy Factory
    const PumpFightFactory = await ethers.getContractFactory("PumpFightFactory");
    factory = await PumpFightFactory.deploy(
      verificationRegistry.address,
      owner.address // platform treasury
    );
    await factory.deployed();

    // Verify fighter
    await verificationRegistry.verifyFighter(
      fighter.address,
      "Test Fighter",
      "Heavyweight",
      "UFC",
      15,
      3
    );

    // Create fighter token
    const creationFee = ethers.utils.parseEther("100");
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

  it("Should check token state", async function () {
    console.log("Token address:", fighterToken.address);
    console.log("Fighter:", await fighterToken.fighter());
    console.log("Factory:", await fighterToken.factory());
    console.log("Paused:", await fighterToken.paused());
    console.log("Graduated:", await fighterToken.isGraduated());
    
    const bondingCurve = await fighterToken.bondingCurve();
    console.log("Initial price:", bondingCurve.currentPrice.toString());
    console.log("Tokens sold:", bondingCurve.tokensSold.toString());
    console.log("Current step:", bondingCurve.currentStep.toString());
    
    const config = await fighterToken.config();
    console.log("Max supply:", config.maxSupply.toString());
    console.log("Step size:", config.stepSize.toString());

    // Try to calculate tokens
    const buyAmount = ethers.utils.parseEther("1");
    console.log("Buy amount:", buyAmount.toString());
    
    try {
      const tokensOut = await fighterToken.calculateTokensFromCHZ(buyAmount);
      console.log("Tokens out:", tokensOut.toString());
    } catch (error) {
      console.log("Calculate error:", error.message);
    }

    // Try to buy tokens
    try {
      console.log("Buyer balance before:", (await buyer.getBalance()).toString());
      const tx = await fighterToken.connect(buyer).buy(0, { value: buyAmount });
      const receipt = await tx.wait();
      console.log("Buy successful, gas used:", receipt.gasUsed.toString());
      console.log("Buyer token balance:", (await fighterToken.balanceOf(buyer.address)).toString());
    } catch (error) {
      console.log("Buy error:", error.message);
      console.log("Error reason:", error.reason);
      console.log("Error code:", error.code);
    }
  });
});