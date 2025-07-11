// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "../interfaces/IVerificationRegistry.sol";

/**
 * @title VerificationRegistry
 * @dev Manages fighter verification and profiles
 */
contract VerificationRegistry is IVerificationRegistry, AccessControl, Pausable {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    mapping(address => FighterProfile) private _fighters;
    mapping(string => address) private _nameToFighter;
    
    uint256 public totalVerifiedFighters;
    
    modifier onlyVerifiedFighter(address fighter) {
        require(isVerifiedFighter(fighter), "Fighter not verified");
        _;
    }
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }
    
    /**
     * @dev Verify a fighter with their profile information
     */
    function verifyFighter(
        address fighter,
        string calldata name,
        string calldata division,
        string calldata organization,
        uint256 wins,
        uint256 losses
    ) external onlyRole(VERIFIER_ROLE) whenNotPaused {
        require(fighter != address(0), "Invalid fighter address");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(_nameToFighter[name] == address(0), "Name already taken");
        require(_fighters[fighter].status == FighterStatus.Unverified, "Fighter already verified");
        
        _fighters[fighter] = FighterProfile({
            name: name,
            division: division,
            organization: organization,
            record_wins: wins,
            record_losses: losses,
            status: FighterStatus.Verified,
            verificationTime: block.timestamp
        });
        
        _nameToFighter[name] = fighter;
        totalVerifiedFighters++;
        
        emit FighterVerified(fighter, name);
    }
    
    /**
     * @dev Suspend a fighter
     */
    function suspendFighter(address fighter, string calldata reason) 
        external 
        onlyRole(VERIFIER_ROLE) 
        onlyVerifiedFighter(fighter) 
    {
        _fighters[fighter].status = FighterStatus.Suspended;
        emit FighterSuspended(fighter, reason);
    }
    
    /**
     * @dev Check if a fighter is verified
     */
    function isVerifiedFighter(address fighter) public view returns (bool) {
        return _fighters[fighter].status == FighterStatus.Verified;
    }
    
    /**
     * @dev Get fighter profile
     */
    function getFighterProfile(address fighter) external view returns (FighterProfile memory) {
        return _fighters[fighter];
    }
    
    /**
     * @dev Get fighter address by name
     */
    function getFighterByName(string calldata name) external view returns (address) {
        return _nameToFighter[name];
    }
    
    /**
     * @dev Pause the contract
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}