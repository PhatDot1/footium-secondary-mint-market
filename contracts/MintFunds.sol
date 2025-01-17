// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MintFundsHandler {
    address public mintingWallet; 
    address public owner; // Owner of contract for withdraw

    event FundsValidated(
        address indexed user,
        uint256 amountSent,
        uint256 mintPrice,
        string playerId,
        uint256 clubId,
        address indexed recipient
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor(address _mintingWallet) {
        mintingWallet = _mintingWallet;
        owner = msg.sender;
    }

    // Receive funds and allocate mint price (I think leave extra amount)
    function receiveFunds(
        uint256 mintPrice,
        uint256 clubId,
        string calldata playerId,
        address recipient
    ) external payable {
        require(msg.value >= mintPrice, "Insufficient funds sent");

        uint256 extraAmount = msg.value - mintPrice;

        // send mint price to mint wallet
        payable(mintingWallet).transfer(mintPrice);

        // emit event to notify backend
        emit FundsValidated(
            msg.sender,
            msg.value,
            mintPrice,
            playerId,
            clubId,
            recipient
        );

        
    }

    // To allow withdraw of 'profit' funds
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(owner).transfer(balance);
    }

    // In case of future change, function to change minting wallet address if needed
    function updateMintingWallet(address _mintingWallet) external onlyOwner {
        require(_mintingWallet != address(0), "Invalid address");
        mintingWallet = _mintingWallet;
    }
}