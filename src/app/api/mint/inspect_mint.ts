import { ethers } from "ethers";

// Constants
const RPC_URL = process.env.ARBITRUM_RPC_URL as string;
const TRANSACTION_HASH = "0x9e933f56e6523c7479b859ebe1a496617065dabff4000c0252c854295e041413"; // Replace with your transaction hash

const MINT_CONTRACT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "clubId", type: "uint256" },
      { indexed: true, internalType: "uint256", name: "assetId", type: "uint256" },
      { indexed: false, internalType: "string", name: "playerId", type: "string" },
      { indexed: false, internalType: "uint256", name: "mintPrice", type: "uint256" },
    ],
    name: "AcademyPlayerMinted",
    type: "event",
  },
];

async function decodeEventLogs(transactionHash: string, abi: any) {
  try {
    // Connect to the provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // Fetch the transaction receipt
    const receipt = await provider.getTransactionReceipt(transactionHash);

    // Check if the receipt is null
    if (!receipt) {
      console.error("Transaction receipt is null. Please check the transaction hash.");
      return null;
    }

    // Create an Interface instance with the ABI
    const iface = new ethers.Interface(abi);

    // Decode logs using the ABI
    const events = receipt.logs.map((log) => {
      try {
        return iface.parseLog(log);
      } catch (error) {
        // Skip logs that do not match the ABI
        return null;
      }
    }).filter((event) => event !== null); // Remove null values

    return events;
  } catch (error) {
    console.error("Error decoding logs:", error);
    return null;
  }
}

// Fetch and decode the logs
(async () => {
  const events = await decodeEventLogs(TRANSACTION_HASH, MINT_CONTRACT_ABI);

  // Print the decoded events
  if (events && events.length > 0) {
    console.log("Decoded Events:");
    events.forEach((event) => {
      console.log(event);
    });
  } else {
    console.log("No events found or failed to decode logs.");
  }
})();
