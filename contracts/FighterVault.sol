// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title FighterVault
 * @dev Manages staking, voting, and revenue distribution for fighter tokens
 */
contract FighterVault is Ownable, ReentrancyGuard, Pausable {
    using SafeMath for uint256;
    
    struct StakeInfo {
        uint256 amount;           // Amount of tokens staked
        uint256 stakingTime;      // When staking started
        uint256 lastClaimTime;    // Last time rewards were claimed
        uint256 tier;             // Staking tier (0=Bronze, 1=Silver, 2=Gold)
    }
    
    struct VoteOption {
        string description;
        uint256 votes;
    }
    
    struct Vote {
        string topic;             // "walkout_song", "next_opponent", "training_camp"
        VoteOption[] options;
        uint256 deadline;
        uint256 minStakeRequired;
        bool active;
        mapping(address => bool) hasVoted;
        mapping(address => uint256) voterChoices;
    }
    
    struct Prediction {
        string question;          // "Will fighter win next fight?"
        uint256 optionA_stake;    // Total staked on option A
        uint256 optionB_stake;    // Total staked on option B
        mapping(address => uint256) userPredictions; // 0=no bet, 1=A, 2=B
        mapping(address => uint256) userStakes;
        bool resolved;
        uint256 winningOption;    // 1 or 2, 0 if not resolved
        uint256 deadline;
    }
    
    IERC20 public fighterToken;
    address public fighter;
    address public factory;
    
    // Staking
    mapping(address => StakeInfo) public stakes;
    uint256 public totalStaked;
    uint256 public rewardPool;
    
    // Tier thresholds (in tokens)
    uint256 public constant BRONZE_THRESHOLD = 1000 * 10**18;    // 1k tokens
    uint256 public constant SILVER_THRESHOLD = 10000 * 10**18;   // 10k tokens
    uint256 public constant GOLD_THRESHOLD = 100000 * 10**18;    // 100k tokens
    
    // Voting
    mapping(uint256 => Vote) public votes;
    uint256 public voteCounter;
    
    // Predictions
    mapping(uint256 => Prediction) public predictions;
    uint256 public predictionCounter;
    
    // Revenue sharing
    uint256 public totalRevenue;
    mapping(address => uint256) public claimedRevenue;
    
    // Events
    event Staked(address indexed user, uint256 amount, uint256 tier);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event VoteCreated(uint256 indexed voteId, string topic, uint256 deadline);
    event VoteCasted(uint256 indexed voteId, address indexed voter, uint256 option);
    event PredictionCreated(uint256 indexed predictionId, string question, uint256 deadline);
    event PredictionPlaced(uint256 indexed predictionId, address indexed user, uint256 option, uint256 amount);
    event PredictionResolved(uint256 indexed predictionId, uint256 winningOption);
    event RevenueDistributed(uint256 amount);
    
    modifier onlyFighter() {
        require(msg.sender == fighter, "Only fighter can call");
        _;
    }
    
    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory can call");
        _;
    }
    
    constructor(address _fighter, address _factory) {
        require(_fighter != address(0), "Invalid fighter address");
        require(_factory != address(0), "Invalid factory address");
        
        fighter = _fighter;
        factory = _factory;
        _transferOwnership(_fighter);
    }
    
    /**
     * @dev Set the fighter token address (called by factory after token creation)
     */
    function setTokenAddress(address _fighterToken) external onlyFactory {
        require(address(fighterToken) == address(0), "Token already set");
        require(_fighterToken != address(0), "Invalid token address");
        fighterToken = IERC20(_fighterToken);
    }
    
    /**
     * @dev Stake fighter tokens
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(fighterToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        StakeInfo storage userStake = stakes[msg.sender];
        
        // If first time staking, set initial values
        if (userStake.amount == 0) {
            userStake.stakingTime = block.timestamp;
            userStake.lastClaimTime = block.timestamp;
        }
        
        userStake.amount = userStake.amount.add(amount);
        totalStaked = totalStaked.add(amount);
        
        // Update tier
        userStake.tier = _calculateTier(userStake.amount);
        
        emit Staked(msg.sender, amount, userStake.tier);
    }
    
    /**
     * @dev Unstake fighter tokens
     */
    function unstake(uint256 amount) external nonReentrant {
        StakeInfo storage userStake = stakes[msg.sender];
        require(userStake.amount >= amount, "Insufficient staked amount");
        
        // Claim pending rewards first
        _claimRewards(msg.sender);
        
        userStake.amount = userStake.amount.sub(amount);
        totalStaked = totalStaked.sub(amount);
        
        // Update tier
        userStake.tier = _calculateTier(userStake.amount);
        
        require(fighterToken.transfer(msg.sender, amount), "Transfer failed");
        
        emit Unstaked(msg.sender, amount);
    }
    
    /**
     * @dev Claim staking rewards
     */
    function claimRewards() external nonReentrant {
        _claimRewards(msg.sender);
    }
    
    /**
     * @dev Internal function to claim rewards
     */
    function _claimRewards(address user) private {
        StakeInfo storage userStake = stakes[user];
        require(userStake.amount > 0, "No tokens staked");
        
        uint256 rewards = calculateRewards(user);
        if (rewards > 0) {
            userStake.lastClaimTime = block.timestamp;
            rewardPool = rewardPool.sub(rewards);
            payable(user).transfer(rewards);
            emit RewardsClaimed(user, rewards);
        }
    }
    
    /**
     * @dev Calculate pending rewards for a user
     */
    function calculateRewards(address user) public view returns (uint256) {
        StakeInfo memory userStake = stakes[user];
        if (userStake.amount == 0 || totalStaked == 0) return 0;
        
        uint256 timeStaked = block.timestamp.sub(userStake.lastClaimTime);
        uint256 userShare = userStake.amount.mul(1e18).div(totalStaked);
        
        // Base APY: 10% for Bronze, 15% for Silver, 20% for Gold
        uint256 apy = userStake.tier == 0 ? 10 : (userStake.tier == 1 ? 15 : 20);
        uint256 rewards = rewardPool.mul(userShare).mul(apy).mul(timeStaked).div(
            1e18 * 100 * 365 days
        );
        
        return rewards;
    }
    
    /**
     * @dev Calculate user's staking tier
     */
    function _calculateTier(uint256 amount) private pure returns (uint256) {
        if (amount >= GOLD_THRESHOLD) return 2; // Gold
        if (amount >= SILVER_THRESHOLD) return 1; // Silver
        if (amount >= BRONZE_THRESHOLD) return 0; // Bronze
        return 0; // Default to Bronze for any staked amount
    }
    
    /**
     * @dev Create a new vote (fighter only)
     */
    function createVote(
        string calldata topic,
        string[] calldata options,
        uint256 duration,
        uint256 minStakeRequired
    ) external onlyFighter {
        require(options.length >= 2, "Need at least 2 options");
        require(duration > 0, "Duration must be positive");
        
        uint256 voteId = voteCounter++;
        Vote storage newVote = votes[voteId];
        newVote.topic = topic;
        newVote.deadline = block.timestamp.add(duration);
        newVote.minStakeRequired = minStakeRequired;
        newVote.active = true;
        
        // Add options
        for (uint256 i = 0; i < options.length; i++) {
            newVote.options.push(VoteOption({
                description: options[i],
                votes: 0
            }));
        }
        
        emit VoteCreated(voteId, topic, newVote.deadline);
    }
    
    /**
     * @dev Cast a vote
     */
    function castVote(uint256 voteId, uint256 optionIndex) external {
        Vote storage vote = votes[voteId];
        require(vote.active, "Vote not active");
        require(block.timestamp <= vote.deadline, "Vote has ended");
        require(!vote.hasVoted[msg.sender], "Already voted");
        require(optionIndex < vote.options.length, "Invalid option");
        require(stakes[msg.sender].amount >= vote.minStakeRequired, "Insufficient stake");
        
        vote.hasVoted[msg.sender] = true;
        vote.voterChoices[msg.sender] = optionIndex;
        
        // Weight vote by staked amount
        uint256 votePower = stakes[msg.sender].amount;
        vote.options[optionIndex].votes = vote.options[optionIndex].votes.add(votePower);
        
        emit VoteCasted(voteId, msg.sender, optionIndex);
    }
    
    /**
     * @dev Create a prediction market (fighter only)
     */
    function createPrediction(
        string calldata question,
        uint256 duration
    ) external onlyFighter {
        require(duration > 0, "Duration must be positive");
        
        uint256 predictionId = predictionCounter++;
        Prediction storage newPrediction = predictions[predictionId];
        newPrediction.question = question;
        newPrediction.deadline = block.timestamp.add(duration);
        newPrediction.resolved = false;
        newPrediction.winningOption = 0;
        
        emit PredictionCreated(predictionId, question, newPrediction.deadline);
    }
    
    /**
     * @dev Place a prediction bet
     */
    function placePrediction(uint256 predictionId, uint256 option) external payable {
        Prediction storage prediction = predictions[predictionId];
        require(block.timestamp <= prediction.deadline, "Prediction has ended");
        require(!prediction.resolved, "Prediction already resolved");
        require(option == 1 || option == 2, "Invalid option");
        require(msg.value > 0, "Must send CHZ");
        require(stakes[msg.sender].amount > 0, "Must be a token holder");
        
        prediction.userPredictions[msg.sender] = option;
        prediction.userStakes[msg.sender] = prediction.userStakes[msg.sender].add(msg.value);
        
        if (option == 1) {
            prediction.optionA_stake = prediction.optionA_stake.add(msg.value);
        } else {
            prediction.optionB_stake = prediction.optionB_stake.add(msg.value);
        }
        
        emit PredictionPlaced(predictionId, msg.sender, option, msg.value);
    }
    
    /**
     * @dev Resolve a prediction (fighter only)
     */
    function resolvePrediction(uint256 predictionId, uint256 winningOption) external onlyFighter {
        Prediction storage prediction = predictions[predictionId];
        require(block.timestamp > prediction.deadline, "Prediction not ended");
        require(!prediction.resolved, "Already resolved");
        require(winningOption == 1 || winningOption == 2, "Invalid winning option");
        
        prediction.resolved = true;
        prediction.winningOption = winningOption;
        
        emit PredictionResolved(predictionId, winningOption);
    }
    
    /**
     * @dev Claim prediction winnings
     */
    function claimPredictionWinnings(uint256 predictionId) external nonReentrant {
        Prediction storage prediction = predictions[predictionId];
        require(prediction.resolved, "Prediction not resolved");
        require(prediction.userPredictions[msg.sender] == prediction.winningOption, "Did not win");
        require(prediction.userStakes[msg.sender] > 0, "No stake to claim");
        
        uint256 userStake = prediction.userStakes[msg.sender];
        uint256 totalWinningStake = prediction.winningOption == 1 ? 
            prediction.optionA_stake : prediction.optionB_stake;
        uint256 totalLosingStake = prediction.winningOption == 1 ? 
            prediction.optionB_stake : prediction.optionA_stake;
        
        // Calculate winnings: original stake + proportional share of losing stakes
        uint256 winnings = userStake.add(
            totalLosingStake.mul(userStake).div(totalWinningStake)
        );
        
        prediction.userStakes[msg.sender] = 0;
        payable(msg.sender).transfer(winnings);
    }
    
    /**
     * @dev Distribute revenue to stakers (called when fighter earns money)
     */
    function distributeRevenue() external payable onlyFighter {
        require(msg.value > 0, "No revenue to distribute");
        
        rewardPool = rewardPool.add(msg.value);
        totalRevenue = totalRevenue.add(msg.value);
        
        emit RevenueDistributed(msg.value);
    }
    
    /**
     * @dev Get vote details
     */
    function getVote(uint256 voteId) external view returns (
        string memory topic,
        uint256 deadline,
        uint256 minStakeRequired,
        bool active
    ) {
        Vote storage vote = votes[voteId];
        return (vote.topic, vote.deadline, vote.minStakeRequired, vote.active);
    }
    
    /**
     * @dev Get vote option details
     */
    function getVoteOption(uint256 voteId, uint256 optionIndex) external view returns (
        string memory description,
        uint256 votesCount
    ) {
        Vote storage vote = votes[voteId];
        require(optionIndex < vote.options.length, "Invalid option index");
        VoteOption storage option = vote.options[optionIndex];
        return (option.description, option.votes);
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
    
    /**
     * @dev Receive CHZ (adds to reward pool)
     */
    receive() external payable {
        if (msg.value > 0) {
            rewardPool = rewardPool.add(msg.value);
            totalRevenue = totalRevenue.add(msg.value);
            emit RevenueDistributed(msg.value);
        }
    }
}