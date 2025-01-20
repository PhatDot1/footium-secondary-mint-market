const { ethers } = require("ethers");

async function main() {
    // Hardcoded variables
    const rpcUrl = "https://arbitrum-mainnet.infura.io/v3/0d4aa52670ca4855b637394cb6d0f9ab"; // Replace with your RPC URL
    const privateKey = process.env.TEST_PRIV_KEY as string;; // Replace with your private key
    const contractAddress = "0xF164FD933606D0F8b2361ebC0083843FD9177faB"; // Replace with your deployed contract address
    //vconst mintingWallet = "0xYourMintingWalletAddress"; // not needed here

    // Dynamic input variables
    const mintPrice = ethers.utils.parseEther("0.0128"); // Example mint price (in ETH)
    const clubId = 2690; // Example club ID
    const playerId = "5-2690-4"; // Example player ID
    const recipient = "0x1fF116257e646b6C0220a049e893e81DE87fc475"; // Replace with recipient's wallet address

    // Initialize ethers.js
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`Using wallet: ${wallet.address}`);

    // Contract ABI (only include necessary parts for this script)
    const contractABI = [
        "function receiveFunds(uint256 mintPrice, uint256 clubId, string calldata playerId, address recipient) external payable",
    ];

    // Initialize contract
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);

    try {
        console.log("Triggering the contract...");

        // Send transaction
        const tx = await contract.receiveFunds(
            mintPrice, // Mint price
            clubId,    // Club ID
            playerId,  // Player ID
            recipient, // Recipient address
            {
                value: ethers.utils.parseEther("0.02"), // Example: mint price + extra (in ETH)
                gasLimit: 300000, // Adjust gas limit as needed
            }
        );

        console.log(`Transaction sent! Hash: ${tx.hash}`);

        // Wait for transaction confirmation
        const receipt = await tx.wait();
        console.log("Transaction confirmed:", receipt);
    } catch (error) {
        console.error("Error triggering the contract:", error);
    }
}

main().catch((error) => {
    console.error("Script failed:", error);
    process.exitCode = 1;
});