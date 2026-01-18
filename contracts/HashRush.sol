// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HashRush
 * @dev Mining game rewards contract - distributes USDC rewards to players
 */
contract HashRush is Ownable, ReentrancyGuard {
    
    // USDC on Base Mainnet: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    IERC20 public immutable usdcToken;
    
    // Reward amount: 0.1 USDC = 10000 (USDC has 6 decimals)
    uint256 public rewardAmount = 1000; // 0.1 USDC
    
    // Minimum HP required to redeem
    uint256 public minHpRequired = 1000;
    
    // Cooldown between redeems (1 day)
    uint256 public redeemCooldown = 1 days;
    
    // Track last redeem time per user
    mapping(address => uint256) public lastRedeemTime;
    
    // Track total rewards claimed per user
    mapping(address => uint256) public totalClaimed;
    
    // Events
    event Redeemed(address indexed user, uint256 amount, uint256 timestamp);
    event RewardAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event Funded(address indexed funder, uint256 amount);
    event Withdrawn(address indexed owner, uint256 amount);
    
    constructor(address _usdcToken) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcToken);
    }
    
    /**
     * @dev Redeem USDC reward
     * @param hpAmount The HP amount being redeemed (verified off-chain)
     */
    function redeem(uint256 hpAmount) external nonReentrant {
        require(hpAmount >= minHpRequired, "Insufficient HP");
        require(
            block.timestamp >= lastRedeemTime[msg.sender] + redeemCooldown,
            "Cooldown not passed"
        );
        require(
            usdcToken.balanceOf(address(this)) >= rewardAmount,
            "Insufficient contract balance"
        );
        
        lastRedeemTime[msg.sender] = block.timestamp;
        totalClaimed[msg.sender] += rewardAmount;
        
        bool success = usdcToken.transfer(msg.sender, rewardAmount);
        require(success, "Transfer failed");
        
        emit Redeemed(msg.sender, rewardAmount, block.timestamp);
    }
    
    /**
     * @dev Check if user can redeem
     */
    function canRedeem(address user) external view returns (bool, string memory) {
        if (block.timestamp < lastRedeemTime[user] + redeemCooldown) {
            return (false, "Cooldown active");
        }
        if (usdcToken.balanceOf(address(this)) < rewardAmount) {
            return (false, "Pool empty");
        }
        return (true, "Ready");
    }
    
    /**
     * @dev Get remaining cooldown in seconds
     */
    function getRemainingCooldown(address user) external view returns (uint256) {
        if (block.timestamp >= lastRedeemTime[user] + redeemCooldown) {
            return 0;
        }
        return (lastRedeemTime[user] + redeemCooldown) - block.timestamp;
    }
    
    /**
     * @dev Get contract USDC balance
     */
    function getPoolBalance() external view returns (uint256) {
        return usdcToken.balanceOf(address(this));
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev Update reward amount (only owner)
     */
    function setRewardAmount(uint256 _amount) external onlyOwner {
        emit RewardAmountUpdated(rewardAmount, _amount);
        rewardAmount = _amount;
    }
    
    /**
     * @dev Update minimum HP required (only owner)
     */
    function setMinHpRequired(uint256 _minHp) external onlyOwner {
        minHpRequired = _minHp;
    }
    
    /**
     * @dev Update cooldown (only owner)
     */
    function setCooldown(uint256 _cooldown) external onlyOwner {
        redeemCooldown = _cooldown;
    }
    
    /**
     * @dev Withdraw USDC from contract (only owner)
     */
    function withdrawUSDC(uint256 amount) external onlyOwner {
        require(usdcToken.balanceOf(address(this)) >= amount, "Insufficient balance");
        bool success = usdcToken.transfer(owner(), amount);
        require(success, "Withdraw failed");
        emit Withdrawn(owner(), amount);
    }
    
    /**
     * @dev Withdraw ETH from contract (only owner)
     */
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        (bool success, ) = owner().call{value: balance}("");
        require(success, "ETH withdraw failed");
    }
    
    // Accept ETH deposits
    receive() external payable {
        emit Funded(msg.sender, msg.value);
    }
}
