// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../interfaces/ICAP20.sol";

/**
 * @title SimpleCAP20TokenV3
 * @dev Enhanced CAP-20 token with FIXED bonding curve calculations
 */
contract SimpleCAP20TokenV3 is ERC20, ICAP20, Ownable {
    using SafeMath for uint256;
    
    string[] private _utilities;
    address public creator;
    
    // Simple bonding curve parameters
    uint256 public currentPrice;
    uint256 public priceIncrement;
    uint256 public stepSize;
    uint256 public tokensSold;
    
    event TokensMinted(address indexed buyer, uint256 amount, uint256 chzPaid, uint256 newPrice);
    
    constructor(
        string memory name,
        string memory symbol,
        address _creator,
        uint256 _initialPrice,
        uint256 _priceIncrement,
        uint256 _stepSize
    ) ERC20(name, symbol) {
        creator = _creator;
        _transferOwnership(_creator);
        
        // Initialize bonding curve
        currentPrice = _initialPrice;
        priceIncrement = _priceIncrement;
        stepSize = _stepSize;
        tokensSold = 0;
        
        // Set basic utilities
        _utilities.push("Bonding Curve Token");
        _utilities.push("Dynamic Pricing");
    }
    
    /**
     * @dev Calculate tokens received for CHZ amount
     * FIXED: Proper division - tokens = CHZ / price_per_token
     */
    function calculateTokensFromCHZ(uint256 chzAmount) public view returns (uint256) {
        if (chzAmount == 0 || currentPrice == 0) return 0;
        // tokens = CHZ_amount / price_per_token
        return chzAmount.mul(1e18).div(currentPrice);
    }
    
    /**
     * @dev Calculate CHZ needed for token amount
     * FIXED: Proper multiplication - CHZ = tokens * price_per_token
     */
    function calculateCHZFromTokens(uint256 tokenAmount) public view returns (uint256) {
        if (tokenAmount == 0) return 0;
        // CHZ = token_amount * price_per_token
        return tokenAmount.mul(currentPrice).div(1e18);
    }
    
    /**
     * @dev Mint tokens with dynamic pricing
     */
    function mint(uint256 tokenAmount) external payable {
        require(tokenAmount > 0, "Amount must be greater than 0");
        
        uint256 requiredCHZ = calculateCHZFromTokens(tokenAmount);
        require(msg.value >= requiredCHZ, "Insufficient CHZ sent");
        
        // Store old price for event
        uint256 oldPrice = currentPrice;
        
        // Mint tokens
        _mint(msg.sender, tokenAmount);
        tokensSold = tokensSold.add(tokenAmount);
        
        // Update price if we've crossed a step boundary
        uint256 newStep = tokensSold.div(stepSize);
        uint256 oldStep = tokensSold.sub(tokenAmount).div(stepSize);
        
        if (newStep > oldStep) {
            // Price increases by increment for each new step crossed
            uint256 stepsIncreased = newStep.sub(oldStep);
            currentPrice = currentPrice.add(priceIncrement.mul(stepsIncreased));
        }
        
        // Send CHZ to creator
        payable(creator).transfer(msg.value);
        
        emit TokensMinted(msg.sender, tokenAmount, msg.value, currentPrice);
    }
    
    /**
     * @dev Get current token price
     */
    function getCurrentPrice() external view returns (uint256) {
        return currentPrice;
    }
    
    /**
     * @dev Get bonding curve state
     */
    function getBondingCurveState() external view returns (
        uint256 _currentPrice,
        uint256 _tokensSold,
        uint256 _currentStep,
        uint256 _nextStepAt
    ) {
        _currentPrice = currentPrice;
        _tokensSold = tokensSold;
        _currentStep = tokensSold.div(stepSize);
        _nextStepAt = (_currentStep.add(1)).mul(stepSize);
    }
    
    // CAP-20 Implementation
    function tokenType() external pure override returns (string memory) {
        return "bonding_curve_v3";
    }
    
    function entity() external view override returns (address) {
        return creator;
    }
    
    function utilities() external view override returns (string[] memory) {
        return _utilities;
    }
}

/**
 * @title SimpleTokenLaunchpadV3
 * @dev Enhanced factory with FIXED calculations
 */
contract SimpleTokenLaunchpadV3 is ReentrancyGuard {
    mapping(address => address[]) public creatorTokens;
    address[] public allTokens;
    
    // Default bonding curve parameters - ADJUSTED for better UX
    uint256 public constant DEFAULT_INITIAL_PRICE = 0.001 ether; // 0.001 CHZ per token
    uint256 public constant DEFAULT_PRICE_INCREMENT = 0.0001 ether; // +0.0001 CHZ per step
    uint256 public constant DEFAULT_STEP_SIZE = 1000 * 10**18; // 1000 tokens per step
    
    event SimpleTokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 initialPrice,
        uint256 timestamp
    );
    
    /**
     * @dev Create a new bonding curve token with default parameters
     */
    function createSimpleToken(
        string calldata name,
        string calldata symbol
    ) external nonReentrant {
        require(bytes(name).length > 0, "Name required");
        require(bytes(symbol).length > 0, "Symbol required");
        
        SimpleCAP20TokenV3 token = new SimpleCAP20TokenV3(
            name,
            symbol,
            msg.sender,
            DEFAULT_INITIAL_PRICE,
            DEFAULT_PRICE_INCREMENT,
            DEFAULT_STEP_SIZE
        );
        
        creatorTokens[msg.sender].push(address(token));
        allTokens.push(address(token));
        
        emit SimpleTokenCreated(
            address(token),
            msg.sender,
            name,
            symbol,
            DEFAULT_INITIAL_PRICE,
            block.timestamp
        );
    }
    
    /**
     * @dev Create a bonding curve token with custom parameters
     */
    function createTokenWithParams(
        string calldata name,
        string calldata symbol,
        uint256 initialPrice,
        uint256 priceIncrement,
        uint256 stepSize
    ) external nonReentrant {
        require(bytes(name).length > 0, "Name required");
        require(bytes(symbol).length > 0, "Symbol required");
        require(initialPrice > 0, "Initial price must be > 0");
        require(priceIncrement > 0, "Price increment must be > 0");
        require(stepSize > 0, "Step size must be > 0");
        
        SimpleCAP20TokenV3 token = new SimpleCAP20TokenV3(
            name,
            symbol,
            msg.sender,
            initialPrice,
            priceIncrement,
            stepSize
        );
        
        creatorTokens[msg.sender].push(address(token));
        allTokens.push(address(token));
        
        emit SimpleTokenCreated(
            address(token),
            msg.sender,
            name,
            symbol,
            initialPrice,
            block.timestamp
        );
    }
    
    /**
     * @dev Get tokens created by an address
     */
    function getCreatorTokens(address creator) external view returns (address[] memory) {
        return creatorTokens[creator];
    }
    
    /**
     * @dev Get total number of tokens
     */
    function getTotalTokens() external view returns (uint256) {
        return allTokens.length;
    }
    
    /**
     * @dev Get default parameters for reference
     */
    function getDefaultParams() external pure returns (uint256, uint256, uint256) {
        return (DEFAULT_INITIAL_PRICE, DEFAULT_PRICE_INCREMENT, DEFAULT_STEP_SIZE);
    }
}