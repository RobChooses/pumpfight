// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./FighterToken.sol";
import "./FighterVault.sol";
import "../interfaces/IVerificationRegistry.sol";

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
    
    // Creation fee to prevent spam
    uint256 public constant CREATION_FEE = 100 * 10**18; // 100 CHZ
    
    // Vesting period for creator tokens
    uint256 public constant CREATOR_VESTING_PERIOD = 90 days;
    
    IVerificationRegistry public verificationRegistry;
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
    
    modifier onlyVerifiedFighter() {
        require(
            verificationRegistry.isVerifiedFighter(msg.sender),
            "Fighter not verified"
        );
        _;
    }
    
    constructor(
        address _verificationRegistry,
        address _platformTreasury
    ) {
        require(_verificationRegistry != address(0), "Invalid registry address");
        require(_platformTreasury != address(0), "Invalid treasury address");
        
        verificationRegistry = IVerificationRegistry(_verificationRegistry);
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
    ) external payable onlyVerifiedFighter nonReentrant whenNotPaused {
        require(msg.value >= CREATION_FEE, "Insufficient creation fee");
        require(bytes(tokenName).length > 0, "Token name required");
        require(bytes(tokenSymbol).length > 0, "Token symbol required");
        
        // Get fighter profile
        IVerificationRegistry.FighterProfile memory profile = 
            verificationRegistry.getFighterProfile(msg.sender);
        
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
            profile.name,
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
        require(newConfig.initialPrice > 0, "Invalid initial price");
        require(newConfig.stepMultiplier > 1, "Invalid step multiplier");
        require(newConfig.stepSize > 0, "Invalid step size");
        require(newConfig.graduationTarget > 0, "Invalid graduation target");
        require(newConfig.creatorShare <= 1000, "Creator share too high"); // Max 10%
        require(newConfig.platformFee <= 500, "Platform fee too high"); // Max 5%
        require(newConfig.maxSupply > newConfig.graduationTarget, "Invalid max supply");
        
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
     * @dev Update verification registry
     */
    function updateVerificationRegistry(address newRegistry) external onlyOwner {
        require(newRegistry != address(0), "Invalid registry address");
        verificationRegistry = IVerificationRegistry(newRegistry);
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