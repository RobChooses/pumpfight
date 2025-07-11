// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IVerificationRegistry
 * @dev Interface for fighter verification system
 */
interface IVerificationRegistry {
    enum FighterStatus {
        Unverified,
        Pending,
        Verified,
        Suspended
    }
    
    struct FighterProfile {
        string name;
        string division;
        string organization; // UFC, Bellator, etc.
        uint256 record_wins;
        uint256 record_losses;
        FighterStatus status;
        uint256 verificationTime;
    }
    
    event FighterVerified(address indexed fighter, string name);
    event FighterSuspended(address indexed fighter, string reason);
    
    function verifyFighter(
        address fighter,
        string calldata name,
        string calldata division,
        string calldata organization,
        uint256 wins,
        uint256 losses
    ) external;
    
    function suspendFighter(address fighter, string calldata reason) external;
    
    function isVerifiedFighter(address fighter) external view returns (bool);
    
    function getFighterProfile(address fighter) external view returns (FighterProfile memory);
}