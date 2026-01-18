// Sources flattened with hardhat v2.28.3 https://hardhat.org

// SPDX-License-Identifier: MIT

// File @openzeppelin/contracts/utils/Context.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

pragma solidity ^0.8.20;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}


// File @openzeppelin/contracts/access/Ownable.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}


// File @openzeppelin/contracts/token/ERC20/IERC20.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/IERC20.sol)

pragma solidity >=0.4.16;

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}


// File @openzeppelin/contracts/utils/ReentrancyGuard.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/ReentrancyGuard.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    uint256 private _status;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}


// File contracts/HashRush.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.20;
/**
 * @title HashRush
 * @dev Mining game rewards contract
 * All actions are recorded on-chain for transparency
 */
contract HashRush is Ownable, ReentrancyGuard {
    
    // USDC on Base Mainnet: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    IERC20 public immutable usdcToken;
    
    // Reward: 1000 HP = 0.1 USDC = 100000 (USDC has 6 decimals)
    uint256 public rewardAmount = 100000; // 0.1 USDC
    
    // Minimum HP required to redeem USDC
    uint256 public minHpRequired = 1000;
    
    // Cooldown between USDC redeems (1 day)
    uint256 public redeemCooldown = 1 days;
    
    // Track last redeem time per user
    mapping(address => uint256) public lastRedeemTime;
    
    // Track total USDC claimed per user
    mapping(address => uint256) public totalUsdcClaimed;
    
    // Track total HP claimed per user (on-chain record)
    mapping(address => uint256) public totalHpClaimed;
    
    // Track total claims count per user
    mapping(address => uint256) public claimCount;
    
    // Track total ETH spent on hardware per user
    mapping(address => uint256) public totalHardwareSpent;
    
    // Hardware item prices in wei
    mapping(string => uint256) public hardwarePrices;
    
    // Events
    event PointsClaimed(address indexed user, uint256 amount, uint256 totalClaimed, uint256 timestamp);
    event HardwarePurchased(address indexed user, string itemId, uint256 amount, uint256 timestamp);
    event UsdcRedeemed(address indexed user, uint256 hpAmount, uint256 usdcAmount, uint256 timestamp);
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
     * @dev Claim HP points - recorded on-chain, NO ETH required
     * User only pays gas fee
     * @param amount The HP amount being claimed
     */
    function claimPoints(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        totalHpClaimed[msg.sender] += amount;
        claimCount[msg.sender] += 1;
        
        emit PointsClaimed(msg.sender, amount, totalHpClaimed[msg.sender], block.timestamp);
    }
    
    /**
     * @dev Buy hardware - ETH goes to contract
     * @param itemId The hardware item ID
     */
    function buyHardware(string calldata itemId) external payable nonReentrant {
        uint256 price = hardwarePrices[itemId];
        require(price > 0, "Invalid item");
        require(msg.value >= price, "Insufficient ETH");
        
        totalHardwareSpent[msg.sender] += price;
        
        // Refund excess ETH if any
        if (msg.value > price) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - price}("");
            require(refundSuccess, "Refund failed");
        }
        
        emit HardwarePurchased(msg.sender, itemId, price, block.timestamp);
    }
    
    /**
     * @dev Redeem USDC reward - user pays only gas fee
     * @param hpAmount The HP amount being redeemed (for logging)
     */
    function redeemUsdc(uint256 hpAmount) external nonReentrant {
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
        totalUsdcClaimed[msg.sender] += rewardAmount;
        
        bool success = usdcToken.transfer(msg.sender, rewardAmount);
        require(success, "Transfer failed");
        
        emit UsdcRedeemed(msg.sender, hpAmount, rewardAmount, block.timestamp);
    }
    
    // Legacy function name for compatibility
    function redeem(uint256 hpAmount) external {
        this.redeemUsdc(hpAmount);
    }
    
    /**
     * @dev Check if user can redeem USDC
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
     * @dev Get user stats
     */
    function getUserStats(address user) external view returns (
        uint256 hpClaimed,
        uint256 usdcClaimed,
        uint256 hardwareSpent,
        uint256 claims
    ) {
        return (
            totalHpClaimed[user],
            totalUsdcClaimed[user],
            totalHardwareSpent[user],
            claimCount[user]
        );
    }
    
    /**
     * @dev Get hardware price
     */
    function getHardwarePrice(string calldata itemId) external view returns (uint256) {
        return hardwarePrices[itemId];
    }
    
    // ============ Admin Functions ============
    
    function setHardwarePrice(string calldata itemId, uint256 price) external onlyOwner {
        hardwarePrices[itemId] = price;
    }
    
    function setRewardAmount(uint256 _amount) external onlyOwner {
        emit RewardAmountUpdated(rewardAmount, _amount);
        rewardAmount = _amount;
    }
    
    function setMinHpRequired(uint256 _minHp) external onlyOwner {
        minHpRequired = _minHp;
    }
    
    function setCooldown(uint256 _cooldown) external onlyOwner {
        redeemCooldown = _cooldown;
    }
    
    function withdrawUSDC(uint256 amount) external onlyOwner {
        require(usdcToken.balanceOf(address(this)) >= amount, "Insufficient balance");
        bool success = usdcToken.transfer(owner(), amount);
        require(success, "Withdraw failed");
        emit Withdrawn(owner(), amount);
    }
    
    function withdrawETH() external onlyOwner {
        uint256 bal = address(this).balance;
        require(bal > 0, "No ETH to withdraw");
        (bool success, ) = owner().call{value: bal}("");
        require(success, "ETH withdraw failed");
    }
    
    receive() external payable {
        emit Funded(msg.sender, msg.value);
    }
}
