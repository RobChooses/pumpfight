// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ICAP20
 * @dev Interface for CAP-20 tokens (Chiliz Asset Protocol)
 * Extends ERC20 with Chiliz-specific functionality
 */
interface ICAP20 is IERC20 {
    /**
     * @dev Returns the token type (utility, fan, etc.)
     */
    function tokenType() external view returns (string memory);
    
    /**
     * @dev Returns the associated entity (fighter, club, etc.)
     */
    function entity() external view returns (address);
    
    /**
     * @dev Returns the token's utility features
     */
    function utilities() external view returns (string[] memory);
}