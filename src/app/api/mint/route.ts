import { ethers, Interface } from "ethers";
import { parseEther, JsonRpcProvider } from "ethers";
import axios from "axios";

// Constants
const LISTEN_CONTRACT_ADDRESS = "0xF164FD933606D0F8b2361ebC0083843FD9177faB"
const MINT_CONTRACT_ADDRESS = "0x4340970a4A422C0eF264fe504eB41005eC107E1b";
const SEND_NFT_CONTRACT_ADDRESS = "0x1c7b75ffef2ffab57d4a9727003bcd602f978bce";
const MINT_CONTRACT_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "clubId", type: "uint256" },
      { internalType: "string", name: "playerId", type: "string" },
      { internalType: "bytes32[]", name: "mintProof", type: "bytes32[]" },
    ],
    name: "mintPlayer",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];
const NFT_CONTRACT_ABI = [
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

const EVENT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "sender", type: "address" },
      { indexed: false, internalType: "uint256", name: "amountSent", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "mintPrice", type: "uint256" },
      { indexed: false, internalType: "string", name: "playerId", type: "string" },
      { indexed: false, internalType: "uint256", name: "clubId", type: "uint256" },
      { indexed: false, internalType: "address", name: "recipient", type: "address" },
    ],
    name: "FundsValidated",
    type: "event",
  },
];

const RPC_URL = process.env.ARBITRUM_RPC_URL as string;
const PRIVATE_KEY = process.env.HIGH_DIV_PRIV_KEY as string;

// Division mapping and rarity logic
const DIVISION_MAPPING: Record<number | string, string> = {
  28: "div3",
  35: "div2",
  18: "div3",
  2973: "div5",
  1752: "div4",
  95: "div4",
  1808: "div5",
  29: "div3",
  497: "div4",
  27: "div2",
  1643: "div3",
  2878: "div2",
  2116: "div6",
  19: "div3",
  7: "div5",
  2690: "div6",
  div1: "0.120",
  div2: "0.0900",
  div3: "0.0502",
  div4: "0.0292",
  div5: "0.0173",
  div6: "0.0173", // temp changed for testing!
  div7: "0.0080",
  div8: "0.0055",
};

// Delay function
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Main function to dynamically handle events
async function handleDynamicInputs() {
  const provider = new JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const mintContract = new ethers.Contract(MINT_CONTRACT_ADDRESS, MINT_CONTRACT_ABI, wallet);
  const nftContract = new ethers.Contract(SEND_NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, wallet);

  const iface = new Interface(EVENT_ABI);

  console.log("Listening for FundsValidated events...");

  provider.on(
    {
      address: LISTEN_CONTRACT_ADDRESS,
      topics: [ethers.id("FundsValidated(address,uint256,uint256,string,uint256,address)")],
    },
    async (log) => {
      try {
        const parsedEvent = iface.parseLog(log);
        if (!parsedEvent) {
          console.error("Parsed event is null. Skipping...");
          return;
        }
        
        const { sender, amountSent, mintPrice, playerId, clubId, recipient } = parsedEvent.args;
        

        console.log(`FundsValidated event received:
          Sender: ${sender}
          Amount Sent: ${ethers.formatEther(amountSent)}
          Mint Price: ${ethers.formatEther(mintPrice)}
          Player ID: ${playerId}
          Club ID: ${clubId}
          Recipient: ${recipient}
        `);

        // Determine division rarity
        const division = DIVISION_MAPPING[clubId];
        console.log(`Mapped Club ID ${clubId} to Division: ${division}`);

        if (!division) {
          console.error(`No division found for Club ID ${clubId}. Aborting.`);
          return;
        }

        // Step 1: Fetch Merkle proof for minting
        const mintProof = await fetchMerkleProof(playerId);
        if (!mintProof) {
          console.error("Failed to fetch Merkle proof.");
          return;
        }

        // Step 2: Mint the player
        console.log("Sending mint transaction...");
        const mintTx = await mintContract.mintPlayer(clubId, playerId, mintProof, {
          value: mintPrice,
          gasLimit: 1000000,
        });

        console.log(`Transaction sent. Hash: ${mintTx.hash}`);

        // Step 3: Poll for transaction receipt
        let receipt = null;
        while (!receipt) {
          receipt = await provider.getTransactionReceipt(mintTx.hash);
          if (!receipt) {
            console.log("Waiting for transaction to be mined...");
            await delay(2000);
          }
        }

        console.log("Transaction mined. Decoding logs...");

        // Step 4: Decode logs
        const decodedEvents = await decodeEventLogs(mintTx.hash, EVENT_ABI);
        if (decodedEvents && decodedEvents.length > 0) {
          console.log("Decoded Events:");
          decodedEvents.forEach((event) => {
            console.log(event);
          });
        } else {
          console.error("No events found or failed to decode logs.");
          return;
        }

        // Step 5: Extract tokenId
        const academyPlayerMintedEvent = decodedEvents.find((event) => event.name === "AcademyPlayerMinted");
        const tokenId = academyPlayerMintedEvent?.args?.assetId.toString();

        console.log(`Decoded Token ID: ${tokenId}`);

        if (!tokenId) {
          console.error("Token ID not found.");
          return;
        }

        // Step 6: Transfer NFT
        console.log("Checking NFT ownership...");
        const owner = await nftContract.ownerOf(tokenId);
        if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
          console.error("The wallet does not own this token.");
          return;
        }

        console.log("Transferring NFT...");
        const transferTx = await nftContract.transferFrom(wallet.address, recipient, tokenId);
        console.log(`Transaction sent. Hash: ${transferTx.hash}`);

        const transferReceipt = await transferTx.wait();
        console.log(`NFT transferred to recipient: ${recipient}. Transaction hash: ${transferReceipt.transactionHash}`);

        console.log("Transaction completed. The player has been sent to the recipient's wallet.");
      } catch (error) {
        console.error("Error handling event:", error);
      }
    }
  );
}

// Helper: Fetch Merkle proof for minting
async function fetchMerkleProof(playerId: string) {
  const query = `
    query GetMerkleProof($playerId: String!) {
      academyPlayerMerkleProof(playerId: $playerId)
    }
  `;
  try {
    const response = await axios.post("https://live.api.footium.club/api/graphql", {
      query,
      variables: { playerId },
    });
    return response.data?.data?.academyPlayerMerkleProof || null;
  } catch (error) {
    console.error("Error fetching Merkle proof:", error);
    return null;
  }
}

// Helper: Decode event logs
async function decodeEventLogs(transactionHash: string, abi: any) {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const receipt = await provider.getTransactionReceipt(transactionHash);

    if (!receipt) {
      console.error("Transaction receipt is null. Please check the transaction hash.");
      return null;
    }

    const iface = new Interface(abi);

    const events = receipt.logs
      .map((log) => {
        try {
          return iface.parseLog(log);
        } catch {
          return null;
        }
      })
      .filter((event) => event !== null);

    return events;
  } catch (error) {
    console.error("Error decoding logs:", error);
    return null;
  }
}

// Start listening for events
handleDynamicInputs();
