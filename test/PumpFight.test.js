const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PumpFight", function () {
  let verificationRegistry;
  let factory;
  let owner;
  let fighter;
  let buyer;
  let platformTreasury;

  beforeEach(async function () {
    [owner, fighter, buyer, platformTreasury] = await ethers.getSigners();

    // Deploy VerificationRegistry
    const VerificationRegistry = await ethers.getContractFactory("VerificationRegistry");
    verificationRegistry = await VerificationRegistry.deploy();
    await verificationRegistry.deployed();

    // Deploy Factory
    const PumpFightFactory = await ethers.getContractFactory("PumpFightFactory");
    factory = await PumpFightFactory.deploy(
      verificationRegistry.address,
      platformTreasury.address
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
  });

  describe("VerificationRegistry", function () {
    it("Should verify a fighter", async function () {
      expect(await verificationRegistry.isVerifiedFighter(fighter.address)).to.be.true;
      
      const profile = await verificationRegistry.getFighterProfile(fighter.address);
      expect(profile.name).to.equal("Test Fighter");
      expect(profile.division).to.equal("Heavyweight");
      expect(profile.organization).to.equal("UFC");
    });

    it("Should not allow duplicate names", async function () {
      await expect(
        verificationRegistry.verifyFighter(
          buyer.address,
          "Test Fighter", // Same name
          "Lightweight",
          "Bellator",
          10,
          2
        )
      ).to.be.revertedWith("Name already taken");
    });
  });

  describe("PumpFightFactory", function () {
    it("Should create a fighter token", async function () {
      const creationFee = ethers.utils.parseEther("100");
      
      await expect(
        factory.connect(fighter).createFighterToken(
          "Test Fighter Token",
          "TFT",
          "Token for Test Fighter",
          "https://example.com/image.jpg",
          { value: creationFee }
        )
      ).to.emit(factory, "TokenCreated");

      const fighterTokens = await factory.getFighterTokens(fighter.address);
      expect(fighterTokens.length).to.equal(1);
      expect(await factory.isValidToken(fighterTokens[0])).to.be.true;
    });

    it("Should require verification to create token", async function () {
      const creationFee = ethers.utils.parseEther("100");
      
      await expect(
        factory.connect(buyer).createFighterToken(
          "Unverified Token",
          "UVT",
          "Token by unverified user",
          "https://example.com/image.jpg",
          { value: creationFee }
        )
      ).to.be.revertedWith("Fighter not verified");
    });

    it("Should require sufficient creation fee", async function () {
      const insufficientFee = ethers.utils.parseEther("50");
      
      await expect(
        factory.connect(fighter).createFighterToken(
          "Test Fighter Token",
          "TFT",
          "Token for Test Fighter",
          "https://example.com/image.jpg",
          { value: insufficientFee }
        )
      ).to.be.revertedWith("Insufficient creation fee");
    });
  });

  describe("FighterToken", function () {
    let fighterToken;
    let fighterVault;

    beforeEach(async function () {
      const creationFee = ethers.utils.parseEther("100");
      
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
      const vaultAddress = event.args.vault;

      const FighterToken = await ethers.getContractFactory("FighterToken");
      fighterToken = FighterToken.attach(tokenAddress);

      const FighterVault = await ethers.getContractFactory("FighterVault");
      fighterVault = FighterVault.attach(vaultAddress);
    });

    it("Should allow buying tokens", async function () {
      const buyAmount = ethers.utils.parseEther("1"); // 1 CHZ
      
      await expect(
        fighterToken.connect(buyer).buy(0, { value: buyAmount })
      ).to.emit(fighterToken, "TokensPurchased");

      const balance = await fighterToken.balanceOf(buyer.address);
      expect(balance).to.be.gt(0);
    });

    it("Should implement anti-rug cooldown", async function () {
      const buyAmount = ethers.utils.parseEther("1");
      
      // Buy tokens
      await fighterToken.connect(buyer).buy(0, { value: buyAmount });
      const balance = await fighterToken.balanceOf(buyer.address);
      
      // Try to sell immediately (should fail)
      await expect(
        fighterToken.connect(buyer).sell(balance.div(2))
      ).to.be.revertedWith("Sell cooldown active");
    });

    it("Should enforce max sell percentage", async function () {
      const buyAmount = ethers.utils.parseEther("1");
      
      // Buy tokens
      await fighterToken.connect(buyer).buy(0, { value: buyAmount });
      const balance = await fighterToken.balanceOf(buyer.address);
      
      // Fast forward time
      await network.provider.send("evm_increaseTime", [3600]); // 1 hour
      await network.provider.send("evm_mine");
      
      // Try to sell more than 10% (should fail)
      const maxSell = balance.mul(1000).div(10000); // 10%
      await expect(
        fighterToken.connect(buyer).sell(maxSell.add(1))
      ).to.be.revertedWith("Exceeds max sell percentage");
    });

    it("Should calculate token price correctly", async function () {
      const initialPrice = await fighterToken.getCurrentPrice();
      expect(initialPrice).to.equal(ethers.utils.parseEther("0.0005"));
      
      // Buy enough tokens to move to next step
      const config = await factory.defaultConfig();
      const stepSize = config.stepSize;
      
      // Calculate CHZ needed for one full step
      const chzForStep = stepSize.mul(initialPrice).div(ethers.utils.parseEther("1"));
      
      await fighterToken.connect(buyer).buy(0, { value: chzForStep });
      
      // Price should have increased
      const newPrice = await fighterToken.getCurrentPrice();
      expect(newPrice).to.be.gt(initialPrice);
    });
  });

  describe("FighterVault", function () {
    let fighterToken;
    let fighterVault;

    beforeEach(async function () {
      const creationFee = ethers.utils.parseEther("100");
      
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
      const vaultAddress = event.args.vault;

      const FighterToken = await ethers.getContractFactory("FighterToken");
      fighterToken = FighterToken.attach(tokenAddress);

      const FighterVault = await ethers.getContractFactory("FighterVault");
      fighterVault = FighterVault.attach(vaultAddress);

      // Buy some tokens first
      const buyAmount = ethers.utils.parseEther("1");
      await fighterToken.connect(buyer).buy(0, { value: buyAmount });
    });

    it("Should allow staking tokens", async function () {
      const balance = await fighterToken.balanceOf(buyer.address);
      const stakeAmount = balance.div(2);

      // Approve vault to spend tokens
      await fighterToken.connect(buyer).approve(fighterVault.address, stakeAmount);
      
      await expect(
        fighterVault.connect(buyer).stake(stakeAmount)
      ).to.emit(fighterVault, "Staked");

      const stakeInfo = await fighterVault.stakes(buyer.address);
      expect(stakeInfo.amount).to.equal(stakeAmount);
    });

    it("Should allow creating votes", async function () {
      await expect(
        fighterVault.connect(fighter).createVote(
          "Walkout Song",
          ["Song A", "Song B", "Song C"],
          86400, // 1 day
          ethers.utils.parseEther("100") // Min stake
        )
      ).to.emit(fighterVault, "VoteCreated");

      const vote = await fighterVault.getVote(0);
      expect(vote.topic).to.equal("Walkout Song");
      expect(vote.active).to.be.true;
    });

    it("Should allow creating predictions", async function () {
      await expect(
        fighterVault.connect(fighter).createPrediction(
          "Will fighter win next fight?",
          86400 // 1 day
        )
      ).to.emit(fighterVault, "PredictionCreated");
    });
  });
});