// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/ICAP20.sol";

/**
 * @title SimpleCAP20Token
 * @dev Basic CAP-20 token with fixed price minting
 */
contract SimpleCAP20Token is ERC20, ICAP20, Ownable {
    string[] private _utilities;
    address public creator;
    uint256 public constant PRICE_PER_TOKEN = 1 ether; // 1 CHZ per token
    
    constructor(
        string memory name,
        string memory symbol,
        address _creator
    ) ERC20(name, symbol) {
        creator = _creator;
        _transferOwnership(_creator);
        
        // Set basic utilities
        _utilities.push("Basic Token");
        _utilities.push("Fixed Price Minting");
    }
    
    /**
     * @dev Mint tokens by paying CHZ
     */
    function mint(uint256 amount) external payable {
        require(amount > 0, "Amount must be greater than 0");
        require(msg.value == amount * PRICE_PER_TOKEN, "Incorrect CHZ amount");
        
        _mint(msg.sender, amount);
        
        // Send CHZ to creator
        payable(creator).transfer(msg.value);
    }
    
    // CAP-20 Implementation
    function tokenType() external pure override returns (string memory) {
        return "simple";
    }
    
    function entity() external view override returns (address) {
        return creator;
    }
    
    function utilities() external view override returns (string[] memory) {
        return _utilities;
    }
}

/**
 * @title SimpleTokenLaunchpad
 * @dev Factory for creating simple CAP-20 tokens
 */
contract SimpleTokenLaunchpad is ReentrancyGuard {
    mapping(address => address[]) public creatorTokens;
    address[] public allTokens;
    
    event SimpleTokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 timestamp
    );
    
    /**
     * @dev Create a new simple token
     */
    function createSimpleToken(
        string calldata name,
        string calldata symbol
    ) external nonReentrant {
        require(bytes(name).length > 0, "Name required");
        require(bytes(symbol).length > 0, "Symbol required");
        
        SimpleCAP20Token token = new SimpleCAP20Token(
            name,
            symbol,
            msg.sender
        );
        
        creatorTokens[msg.sender].push(address(token));
        allTokens.push(address(token));
        
        emit SimpleTokenCreated(
            address(token),
            msg.sender,
            name,
            symbol,
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
}