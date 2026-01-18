// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HashRush
 * @dev Mining game rewards contract - distributes USDC rewards to players
 * Hardware purchases go to contract and can be withdrawn by owner
 */
contract HashRush is Ownable, ReentrancyGuard {
    
    // USDC on Base Mainnet: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    IERC20 public immutable usdcToken;
    
    // Reward: 1000 HP = 0.1 USDC = 100000 (USDC has 6 decimals)
    uint256 public rewardAmount = 100000; // 0.1 USDC
    
    // Minimum HP required to redeem
    uint256 public minHpRequired = 1000;
    
    // Cooldown between redeems (1 day)
    uint256 public redeemCooldown = 1 days;
    
    // Track last redeem time per user
    mapping(address => uint256) public lastRedeemTime;
    
    // Track total rewards claimed per user
    mapping(address => uint256) public totalClaimed;
    
    // Track total ETH spent on hardware per user
    mapping(address => uint256) public totalHardwareSpent;
    
    // Hardware item prices in wei
    mapping(string => uint256) public hardwarePrices;
    
    // Events
    event Redeemed(address indexed user, uint256 hpAmount, uint256 usdcAmount, uint256 timestamp);
    event HardwarePurchased(address indexed user, string itemId, uint256 amount);
    event RewardAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event Funded(address indexed funder, uint256 amount);
    event Withdrawn(address indexed owner, uint256 amount);
    
    constructor(address _usdcToken) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcToken);
        
        // Set default hardware prices
        hardwarePrices["starter"] = 0.0005 ether;
        hardwarePrices["turbo"] = 0.001 ether;
        hardwarePrices["farm"] = 0.003 ether;
        hardwarePrices["quantum"] = 0.005 ether;
    }
    
    /**
     * @dev Redeem USDC reward - user just pays gas, no ETH transfer
     * @param hpAmount The HP amount being redeemed (for logging)
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
        
        emit Redeemed(msg.sender, hpAmount, rewardAmount, block.timestamp);
    }
    
    /**
     * @dev Buy hardware - ETH goes to contract
     * @param itemId The hardware item ID
     */
    function buyHardware(string calldata itemId) external payable nonReentrant {
        uint256 price = hardwarePrices[itemId];
        require(price > 0, "Invalid item");
        require(msg.value >= price, "Insufficient ETH");
        
        totalHardwareSpent[msg.sender] += msg.value;
        
        // Refund excess ETH if any
        if (msg.value > price) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - price}("");
            require(refundSuccess, "Refund failed");
        }
        
        emit HardwarePurchased(msg.sender, itemId, price);
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
    
    /**
     * @dev Get hardware price
     */
    function getHardwarePrice(string calldata itemId) external view returns (uint256) {
        return hardwarePrices[itemId];
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev Set hardware price (only owner)
     */
    function setHardwarePrice(string calldata itemId, uint256 price) external onlyOwner {
        hardwarePrices[itemId] = price;
    }
    
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
        uint256 bal = address(this).balance;
        require(bal > 0, "No ETH to withdraw");
        (bool success, ) = owner().call{value: bal}("");
        require(success, "ETH withdraw failed");
    }
    
    // Accept ETH deposits
    receive() external payable {
        emit Funded(msg.sender, msg.value);
    }
}
