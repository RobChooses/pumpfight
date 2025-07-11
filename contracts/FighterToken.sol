// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../interfaces/ICAP20.sol";

interface IPumpFightFactory {
    function platformTreasury() external view returns (address);
}

/**
 * @title FighterToken
 * @dev CAP-20 compliant fighter token with bonding curve
 */
contract FighterToken is ERC20, ICAP20, ReentrancyGuard, Pausable {
    using SafeMath for uint256;
    
    struct BondingCurve {
        uint256 currentPrice;      // Current token price in CHZ
        uint256 tokensSold;        // Total tokens sold through bonding curve
        uint256 currentStep;       // Current price step
        uint256 reserveBalance;    // CHZ held in bonding curve
    }
    
    struct TokenConfig {
        uint256 initialPrice;
        uint256 stepMultiplier;
        uint256 stepSize;
        uint256 graduationTarget;
        uint256 creatorShare;
        uint256 platformFee;
        uint256 maxSupply;
    }
    
    BondingCurve public bondingCurve;
    TokenConfig public config;
    
    address public fighter;
    address public fighterVault;
    address public factory;
    string public description;
    string public imageUrl;
    bool public isGraduated;
    
    // Anti-rug mechanisms
    mapping(address => uint256) public lastPurchaseTime;
    uint256 public constant SELL_COOLDOWN = 1 hours;
    uint256 public constant MAX_SELL_PERCENTAGE = 1000; // 10% max sell per transaction
    
    // CAP-20 specific
    string[] private _utilities;
    
    event TokensPurchased(
        address indexed buyer,
        uint256 amount,
        uint256 price,
        uint256 chzSpent
    );
    
    event TokensSold(
        address indexed seller,
        uint256 amount,
        uint256 proceeds
    );
    
    event Graduated(
        uint256 totalRaised,
        address dexPool,
        uint256 timestamp
    );
    
    event PriceUpdated(
        uint256 newPrice,
        uint256 step,
        uint256 tokensSold
    );
    
    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory can call");
        _;
    }
    
    modifier notGraduated() {
        require(!isGraduated, "Token has graduated to DEX");
        _;
    }
    
    constructor(
        string memory _name,
        string memory _symbol,
        address _fighter,
        address _fighterVault,
        address _factory,
        uint256 _initialPrice,
        uint256 _stepMultiplier,
        uint256 _stepSize,
        uint256 _graduationTarget,
        uint256 _creatorShare,
        uint256 _platformFee,
        uint256 _maxSupply,
        string memory _description,
        string memory _imageUrl
    ) ERC20(_name, _symbol) {
        require(_fighter != address(0), "Invalid fighter address");
        require(_fighterVault != address(0), "Invalid vault address");
        require(_factory != address(0), "Invalid factory address");
        
        fighter = _fighter;
        fighterVault = _fighterVault;
        factory = _factory;
        config = TokenConfig({
            initialPrice: _initialPrice,
            stepMultiplier: _stepMultiplier,
            stepSize: _stepSize,
            graduationTarget: _graduationTarget,
            creatorShare: _creatorShare,
            platformFee: _platformFee,
            maxSupply: _maxSupply
        });
        description = _description;
        imageUrl = _imageUrl;
        
        // Initialize bonding curve
        bondingCurve = BondingCurve({
            currentPrice: _initialPrice,
            tokensSold: 0,
            currentStep: 0,
            reserveBalance: 0
        });
        
        // Set utilities
        _utilities.push("Fan Voting");
        _utilities.push("Revenue Sharing");
        _utilities.push("Exclusive Content");
        _utilities.push("Prediction Markets");
    }
    
    /**
     * @dev Buy tokens with CHZ
     */
    function buy(uint256 minTokensOut) external payable nonReentrant whenNotPaused notGraduated {
        require(msg.value > 0, "Must send CHZ");
        
        uint256 tokensToMint = calculateTokensFromCHZ(msg.value);
        require(tokensToMint >= minTokensOut, "Slippage protection failed");
        require(bondingCurve.tokensSold.add(tokensToMint) <= config.maxSupply, "Exceeds max supply");
        
        // Update bonding curve state
        bondingCurve.tokensSold = bondingCurve.tokensSold.add(tokensToMint);
        bondingCurve.reserveBalance = bondingCurve.reserveBalance.add(msg.value);
        
        // Update price if crossing step boundary
        uint256 newStep = bondingCurve.tokensSold.div(config.stepSize);
        if (newStep > bondingCurve.currentStep) {
            bondingCurve.currentStep = newStep;
            bondingCurve.currentPrice = _calculateStepPrice(newStep);
            emit PriceUpdated(bondingCurve.currentPrice, newStep, bondingCurve.tokensSold);
        }
        
        // Mint tokens to buyer
        _mint(msg.sender, tokensToMint);
        lastPurchaseTime[msg.sender] = block.timestamp;
        
        // Distribute fees
        uint256 fighterFee = msg.value.mul(config.creatorShare).div(10000);
        uint256 platformFee = msg.value.mul(config.platformFee).div(10000);
        
        if (fighterFee > 0) {
            payable(fighterVault).transfer(fighterFee);
        }
        if (platformFee > 0) {
            payable(IPumpFightFactory(factory).platformTreasury()).transfer(platformFee);
        }
        
        // Check for graduation
        if (bondingCurve.tokensSold >= config.graduationTarget) {
            _graduate();
        }
        
        emit TokensPurchased(msg.sender, tokensToMint, bondingCurve.currentPrice, msg.value);
    }
    
    /**
     * @dev Sell tokens for CHZ
     */
    function sell(uint256 tokenAmount) external nonReentrant whenNotPaused notGraduated {
        require(balanceOf(msg.sender) >= tokenAmount, "Insufficient balance");
        require(tokenAmount > 0, "Amount must be greater than 0");
        
        // Anti-rug: Cooldown period
        require(
            block.timestamp >= lastPurchaseTime[msg.sender].add(SELL_COOLDOWN),
            "Sell cooldown active"
        );
        
        // Anti-rug: Max sell percentage
        uint256 maxSellAmount = balanceOf(msg.sender).mul(MAX_SELL_PERCENTAGE).div(10000);
        require(tokenAmount <= maxSellAmount, "Exceeds max sell percentage");
        
        // Calculate CHZ to return (with slippage)
        uint256 chzToReturn = calculateCHZFromTokens(tokenAmount);
        require(chzToReturn <= bondingCurve.reserveBalance, "Insufficient reserves");
        
        // Update bonding curve state
        bondingCurve.tokensSold = bondingCurve.tokensSold.sub(tokenAmount);
        bondingCurve.reserveBalance = bondingCurve.reserveBalance.sub(chzToReturn);
        
        // Burn tokens and send CHZ
        _burn(msg.sender, tokenAmount);
        payable(msg.sender).transfer(chzToReturn);
        
        emit TokensSold(msg.sender, tokenAmount, chzToReturn);
    }
    
    /**
     * @dev Calculate tokens received for CHZ amount (simplified bonding curve)
     */
    function calculateTokensFromCHZ(uint256 chzAmount) public view returns (uint256) {
        if (chzAmount == 0) return 0;
        if (bondingCurve.currentPrice == 0) return 0;
        
        // Simple calculation: tokens = CHZ / current_price
        uint256 tokensToMint = chzAmount.mul(1e18).div(bondingCurve.currentPrice);
        
        // Ensure we don't exceed max supply
        uint256 remainingSupply = config.maxSupply.sub(bondingCurve.tokensSold);
        if (tokensToMint > remainingSupply) {
            tokensToMint = remainingSupply;
        }
        
        return tokensToMint;
    }
    
    /**
     * @dev Calculate CHZ received for token amount (with 2% sell tax)
     */
    function calculateCHZFromTokens(uint256 tokenAmount) public view returns (uint256) {
        if (tokenAmount == 0 || tokenAmount > bondingCurve.tokensSold) return 0;
        
        // Simple proportional calculation with sell tax
        uint256 proportion = tokenAmount.mul(1e18).div(bondingCurve.tokensSold);
        uint256 chzAmount = bondingCurve.reserveBalance.mul(proportion).div(1e18);
        
        // Apply 2% sell tax to prevent manipulation
        return chzAmount.mul(98).div(100);
    }
    
    /**
     * @dev Calculate price for a given step (simplified to prevent overflow)
     */
    function _calculateStepPrice(uint256 step) private view returns (uint256) {
        if (step == 0) return config.initialPrice;
        
        // Cap step at 10 to prevent overflow
        if (step > 10) step = 10;
        
        uint256 price = config.initialPrice;
        for (uint256 i = 0; i < step; i++) {
            price = price.mul(config.stepMultiplier);
            // Prevent overflow
            if (price > 1e30) break;
        }
        return price;
    }
    
    /**
     * @dev Graduate token to DEX trading
     */
    function _graduate() private {
        isGraduated = true;
        
        // TODO: Implement DEX liquidity provision
        // This would integrate with KayenSwap or similar Chiliz DEX
        
        emit Graduated(bondingCurve.reserveBalance, address(0), block.timestamp);
    }
    
    /**
     * @dev Get current token price
     */
    function getCurrentPrice() external view returns (uint256) {
        return bondingCurve.currentPrice;
    }
    
    /**
     * @dev Get bonding curve progress to graduation
     */
    function getGraduationProgress() external view returns (uint256, uint256) {
        return (bondingCurve.tokensSold, config.graduationTarget);
    }
    
    // CAP-20 Implementation
    function tokenType() external pure override returns (string memory) {
        return "fighter";
    }
    
    function entity() external view override returns (address) {
        return fighter;
    }
    
    function utilities() external view override returns (string[] memory) {
        return _utilities;
    }
    
    /**
     * @dev Emergency pause (factory only)
     */
    function pause() external onlyFactory {
        _pause();
    }
    
    /**
     * @dev Unpause (factory only)
     */
    function unpause() external onlyFactory {
        _unpause();
    }
    
}