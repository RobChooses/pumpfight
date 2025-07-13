// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../interfaces/ICAP20.sol";

/**
 * @title SimpleCAP20TokenV2
 * @dev Enhanced CAP-20 token with simple bonding curve
 */
contract SimpleCAP20TokenV2 is ERC20, ICAP20, Ownable {
    using SafeMath for uint256;
    
    string[] private _utilities;
    address public creator;
    
    // Simple bonding curve parameters
    uint256 public currentPrice;
    uint256 public priceIncrement;
    uint256 public stepSize;
    uint256 public tokensSold;
    
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
     */
    function calculateTokensFromCHZ(uint256 chzAmount) public view returns (uint256) {
        if (chzAmount == 0 || currentPrice == 0) return 0;
        return chzAmount.div(currentPrice);
    }
    
    /**
     * @dev Calculate CHZ needed for token amount
     */
    function calculateCHZFromTokens(uint256 tokenAmount) public view returns (uint256) {
        if (tokenAmount == 0) return 0;
        return tokenAmount.mul(currentPrice);
    }
    
    /**
     * @dev Mint tokens with dynamic pricing
     */
    function mint(uint256 tokenAmount) external payable {
        require(tokenAmount > 0, "Amount must be greater than 0");
        
        uint256 requiredCHZ = calculateCHZFromTokens(tokenAmount);
        require(msg.value >= requiredCHZ, "Insufficient CHZ sent");
        
        // Mint tokens
        _mint(msg.sender, tokenAmount);
        tokensSold = tokensSold.add(tokenAmount);
        
        // Update price if we've sold enough tokens for next step
        if (tokensSold >= stepSize && tokensSold.div(stepSize) > (tokensSold.sub(tokenAmount)).div(stepSize)) {
            currentPrice = currentPrice.add(priceIncrement);
        }
        
        // Send CHZ to creator
        payable(creator).transfer(msg.value);
    }
    
    /**
     * @dev Get current token price
     */
    function getCurrentPrice() external view returns (uint256) {
        return currentPrice;
    }
    
    // CAP-20 Implementation
    function tokenType() external pure override returns (string memory) {
        return "bonding_curve";
    }
    
    function entity() external view override returns (address) {
        return creator;
    }
    
    function utilities() external view override returns (string[] memory) {
        return _utilities;
    }
}

/**
 * @title SimpleTokenLaunchpadV2
 * @dev Enhanced factory for creating bonding curve tokens
 */
contract SimpleTokenLaunchpadV2 is ReentrancyGuard {
    mapping(address => address[]) public creatorTokens;
    address[] public allTokens;
    
    // Default bonding curve parameters
    uint256 public constant DEFAULT_INITIAL_PRICE = 0.001 ether; // 0.001 CHZ
    uint256 public constant DEFAULT_PRICE_INCREMENT = 0.0005 ether; // +0.0005 CHZ per step
    uint256 public constant DEFAULT_STEP_SIZE = 100 * 10**18; // 100 tokens per step
    
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
        
        SimpleCAP20TokenV2 token = new SimpleCAP20TokenV2(
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
        
        SimpleCAP20TokenV2 token = new SimpleCAP20TokenV2(
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