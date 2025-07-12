// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./FighterToken.sol";
import "./FighterVault.sol";

/**
 * @title PumpFightFactory
 * @dev Factory contract for creating fighter tokens
 */
contract PumpFightFactory is Ownable, ReentrancyGuard, Pausable {
    using SafeMath for uint256;
    
    struct TokenConfig {
        uint256 initialPrice;      // Starting price in CHZ (wei)
        uint256 stepMultiplier;    // Price increase multiplier per step
        uint256 stepSize;          // Tokens per price step
        uint256 graduationTarget;  // Tokens needed for DEX migration
        uint256 creatorShare;      // Fighter's revenue share (basis points)
        uint256 platformFee;       // Platform fee (basis points)
        uint256 maxSupply;         // Hard cap on total supply
    }
    
    // Default configuration with anti-rug parameters
    TokenConfig public defaultConfig = TokenConfig({
        initialPrice: 0.0005 ether,      // ~$0.00005 at CHZ=$0.10
        stepMultiplier: 2,               // 2x price increase per step
        stepSize: 50000 * 10**18,       // 50k tokens per step
        graduationTarget: 300000 * 10**18, // 300k tokens to graduate
        creatorShare: 500,               // 5% to fighter
        platformFee: 250,                // 2.5% platform fee
        maxSupply: 10000000 * 10**18    // 10M max supply
    });
    
    // Creation fee to prevent spam (editable by owner)
    uint256 public creationFee = 1 * 10**18; // 1 CHZ
    
    // Vesting period for creator tokens (editable by owner)
    uint256 public creatorVestingPeriod = 90 days;
    
    address public platformTreasury;
    
    mapping(address => address[]) public fighterTokens;
    mapping(address => bool) public isValidToken;
    address[] public allTokens;
    
    event TokenCreated(
        address indexed token,
        address indexed fighter,
        address indexed vault,
        string fighterName,
        uint256 timestamp
    );
    
    event ConfigUpdated(TokenConfig newConfig);
    
    constructor(
        address _platformTreasury
    ) {
        require(_platformTreasury != address(0), "Invalid treasury address");
        platformTreasury = _platformTreasury;
    }
    
    /**
     * @dev Create a new fighter token
     */
    function createFighterToken(
        string calldata tokenName,
        string calldata tokenSymbol,
        string calldata description,
        string calldata imageUrl
    ) external payable nonReentrant whenNotPaused {
        require(msg.value >= creationFee, "Insufficient creation fee");
        require(bytes(tokenName).length > 0, "Token name required");
        require(bytes(tokenSymbol).length > 0, "Token symbol required");
        
        // Create vault first
        FighterVault vault = new FighterVault(
            msg.sender,
            address(this)
        );
        
        // Create token
        FighterToken token = new FighterToken(
            tokenName,
            tokenSymbol,
            msg.sender,
            address(vault),
            address(this),
            defaultConfig.initialPrice,
            defaultConfig.stepMultiplier,
            defaultConfig.stepSize,
            defaultConfig.graduationTarget,
            defaultConfig.creatorShare,
            defaultConfig.platformFee,
            defaultConfig.maxSupply,
            description,
            imageUrl
        );
        
        // Set vault's token address
        vault.setTokenAddress(address(token));
        
        // Record token
        fighterTokens[msg.sender].push(address(token));
        isValidToken[address(token)] = true;
        allTokens.push(address(token));
        
        // Send creation fee to treasury
        payable(platformTreasury).transfer(msg.value);
        
        emit TokenCreated(
            address(token),
            msg.sender,
            address(vault),
            tokenName, // Use token name instead of profile name
            block.timestamp
        );
    }
    
    /**
     * @dev Get all tokens created by a fighter
     */
    function getFighterTokens(address fighter) external view returns (address[] memory) {
        return fighterTokens[fighter];
    }
    
    /**
     * @dev Get total number of tokens created
     */
    function getTotalTokens() external view returns (uint256) {
        return allTokens.length;
    }
    
    /**
     * @dev Update default token configuration
     */
    function updateDefaultConfig(TokenConfig calldata newConfig) external onlyOwner {
        defaultConfig = newConfig;
        emit ConfigUpdated(newConfig);
    }
    
    /**
     * @dev Update platform treasury address
     */
    function updatePlatformTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        platformTreasury = newTreasury;
    }
    
    
    /**
     * @dev Update creation fee
     */
    function updateCreationFee(uint256 newFee) external onlyOwner {
        require(newFee > 0, "Fee must be greater than 0");
        creationFee = newFee;
    }
    
    /**
     * @dev Update creator vesting period
     */
    function updateCreatorVestingPeriod(uint256 newPeriod) external onlyOwner {
        require(newPeriod > 0, "Vesting period must be greater than 0");
        creatorVestingPeriod = newPeriod;
    }
    
    /**
     * @dev Update initial price
     */
    function updateInitialPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Initial price must be greater than 0");
        defaultConfig.initialPrice = newPrice;
    }
    
    /**
     * @dev Update step multiplier
     */
    function updateStepMultiplier(uint256 newMultiplier) external onlyOwner {
        require(newMultiplier > 1, "Step multiplier must be greater than 1");
        defaultConfig.stepMultiplier = newMultiplier;
    }
    
    /**
     * @dev Update step size
     */
    function updateStepSize(uint256 newSize) external onlyOwner {
        require(newSize > 0, "Step size must be greater than 0");
        defaultConfig.stepSize = newSize;
    }
    
    /**
     * @dev Update graduation target
     */
    function updateGraduationTarget(uint256 newTarget) external onlyOwner {
        require(newTarget > 0, "Graduation target must be greater than 0");
        require(newTarget < defaultConfig.maxSupply, "Target must be less than max supply");
        defaultConfig.graduationTarget = newTarget;
    }
    
    /**
     * @dev Update creator share
     */
    function updateCreatorShare(uint256 newShare) external onlyOwner {
        defaultConfig.creatorShare = newShare;
    }
    
    /**
     * @dev Update platform fee
     */
    function updatePlatformFee(uint256 newFee) external onlyOwner {
        defaultConfig.platformFee = newFee;
    }
    
    /**
     * @dev Update max supply
     */
    function updateMaxSupply(uint256 newSupply) external onlyOwner {
        require(newSupply > defaultConfig.graduationTarget, "Max supply must be greater than graduation target");
        defaultConfig.maxSupply = newSupply;
    }
    
    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}