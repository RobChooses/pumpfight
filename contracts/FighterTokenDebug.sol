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
 * @title FighterTokenDebug
 * @dev Debug version of FighterToken with detailed error messages
 */
contract FighterTokenDebug is ERC20, ICAP20, ReentrancyGuard, Pausable {
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
    
    event DebugStep(string step, uint256 value);
    
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
     * @dev Buy tokens with CHZ (Debug version)
     */
    function buy(uint256 minTokensOut) external payable nonReentrant whenNotPaused notGraduated {
        emit DebugStep("Started buy function", msg.value);
        
        require(msg.value > 0, "Must send CHZ");
        emit DebugStep("Passed msg.value check", msg.value);
        
        uint256 tokensToMint = calculateTokensFromCHZ(msg.value);
        emit DebugStep("Calculated tokens to mint", tokensToMint);
        
        require(tokensToMint >= minTokensOut, "Slippage protection failed");
        emit DebugStep("Passed slippage check", tokensToMint);
        
        require(bondingCurve.tokensSold.add(tokensToMint) <= config.maxSupply, "Exceeds max supply");
        emit DebugStep("Passed max supply check", bondingCurve.tokensSold.add(tokensToMint));
        
        // Calculate and distribute fees first
        uint256 fighterFee = msg.value.mul(config.creatorShare).div(10000);
        uint256 platformFee = msg.value.mul(config.platformFee).div(10000);
        uint256 reserveAmount = msg.value.sub(fighterFee).sub(platformFee);
        emit DebugStep("Calculated fees - fighter", fighterFee);
        emit DebugStep("Calculated fees - platform", platformFee);
        emit DebugStep("Calculated reserve amount", reserveAmount);
        
        // Update bonding curve state with net amount (after fees)
        bondingCurve.tokensSold = bondingCurve.tokensSold.add(tokensToMint);
        bondingCurve.reserveBalance = bondingCurve.reserveBalance.add(reserveAmount);
        emit DebugStep("Updated tokens sold", bondingCurve.tokensSold);
        emit DebugStep("Updated reserve balance", bondingCurve.reserveBalance);
        
        // Update price if crossing step boundary
        uint256 newStep = bondingCurve.tokensSold.div(config.stepSize);
        if (newStep > bondingCurve.currentStep) {
            bondingCurve.currentStep = newStep;
            bondingCurve.currentPrice = _calculateStepPrice(newStep);
            emit DebugStep("Updated price step", newStep);
            emit DebugStep("New price", bondingCurve.currentPrice);
        }
        
        // Mint tokens to buyer
        emit DebugStep("About to mint tokens", tokensToMint);
        _mint(msg.sender, tokensToMint);
        emit DebugStep("Minted tokens successfully", tokensToMint);
        
        lastPurchaseTime[msg.sender] = block.timestamp;
        emit DebugStep("Set purchase time", block.timestamp);
        
        // Transfer fees
        if (fighterFee > 0) {
            emit DebugStep("About to transfer fighter fee", fighterFee);
            payable(fighterVault).transfer(fighterFee);
            emit DebugStep("Transferred fighter fee", fighterFee);
        }
        
        if (platformFee > 0) {
            emit DebugStep("About to transfer platform fee", platformFee);
            payable(IPumpFightFactory(factory).platformTreasury()).transfer(platformFee);
            emit DebugStep("Transferred platform fee", platformFee);
        }
        
        // Check for graduation
        if (bondingCurve.tokensSold >= config.graduationTarget) {
            emit DebugStep("About to graduate", bondingCurve.tokensSold);
            _graduate();
            emit DebugStep("Graduated successfully", bondingCurve.tokensSold);
        }
        
        emit DebugStep("About to emit purchase event", tokensToMint);
        emit TokensPurchased(msg.sender, tokensToMint, bondingCurve.currentPrice, msg.value);
        emit DebugStep("Buy function completed", tokensToMint);
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
    }
    
    /**
     * @dev Get current token price
     */
    function getCurrentPrice() external view returns (uint256) {
        return bondingCurve.currentPrice;
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