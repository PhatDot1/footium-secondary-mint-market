

import { ethers } from "ethers";
import { parseEther, JsonRpcProvider } from "ethers";
import axios from "axios";

// Constants
const MINT_CONTRACT_ADDRESS = "0x4340970a4A422C0eF264fe504eB41005eC107E1b"; // Replace with your mint contract address
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
];

const RPC_URL = "https://arbitrum-mainnet.infura.io/v3/13adc49b2f28418797420c43cb88a918"; // Replace with your RPC URL
const PRIVATE_KEY = "c9a7a59a0d1d58613aa01b3ad8ff92b804a86a56d3eea701a8b67548369b98f5"; // Replace with your private key
const PUBLIC_KEY = "0xCE1c0e4E2356AD252F626d348d7c5778a264446C"; // Replace with your public key

// Hardcoded Test Inputs
const hardcodedInputs = {
  user: "0x1fF116257e646b6C0220a049e893e81DE87fc475", // Replace with the user's wallet address
  amountSent: parseEther("0.0173"), // Replace with the test amount
  mintPrice: parseEther("0.0128"), // Replace with the mint price
  playerId: "5-2690-1", // Replace with the test player ID
  clubId: 2690, // Replace with the test club ID
  recipient: "0x1fF116257e646b6C0220a049e893e81DE87fc475", // Replace with the recipient's wallet address
};

// Division mapping and rarity logic BASED ON SEASON 4
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
  div6: "0.0173", // TEMP SET FOR MY TESTING TO 0.0173
  div7: "0.0080",
  div8: "0.0055",
};

async function testMint() {
  const provider = new JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const mintContract = new ethers.Contract(MINT_CONTRACT_ADDRESS, MINT_CONTRACT_ABI, wallet);

  try {
    console.log("Testing mint flow with hardcoded inputs...");

    const { user, amountSent, mintPrice, playerId, clubId, recipient } = hardcodedInputs;

    // Step 1: Validate transaction details
    const playerData = await fetchPlayerData(playerId);
    if (!playerData) {
      console.error("Player metadata not found.");
      return;
    }

    const division = DIVISION_MAPPING[clubId.toString()];
    const rarity = playerData.rarity;

    // Determine the expected amount sent based on division
    let expectedAmountSent = parseEther(DIVISION_MAPPING[division]);

    // Adjust for rarity if the player is "Rare"
    if (rarity === "Rare") {
      expectedAmountSent = parseEther("0.192"); // Override for rare players
    }

    // Validate the amount sent by the user
    if (amountSent !== expectedAmountSent) {
      console.error(
        `Transaction flagged as invalid. Error code: amountSent|mintPrice|playerId.`
      );
      return;
    }

    console.log("Transaction validated. Proceeding to mint...");

    // Step 2: Fetch Merkle proof for minting
    const mintProof = await fetchMerkleProof(playerId);
    if (!mintProof) {
      console.error("Failed to fetch Merkle proof.");
      return;
    }

    // Step 3: Perform the mint
    const mintTx = await mintContract.mintPlayer(clubId, playerId, mintProof, {
      value: mintPrice,
      gasLimit: 1000000,
    });
    const mintReceipt = await mintTx.wait();
    console.log(`Mint successful! Transaction hash: ${mintReceipt.transactionHash}`);

    // Extract assetId from emitted event
    const event = mintReceipt.events?.find((e: { event: string }) => e.event === "AcademyPlayerMinted");
    if (!event) {
      console.error("AcademyPlayerMinted event not found.");
      return;
    }
    const tokenId = event.args?.assetId.toString();
    console.log(`Minted Token ID: ${tokenId}`);

    // Step 4: Transfer NFT to recipient
    const transferTx = await mintContract.transferFrom(wallet.address, recipient, tokenId);
    const transferReceipt = await transferTx.wait();
    console.log(`NFT transferred to recipient: ${recipient}. Transaction hash: ${transferReceipt.transactionHash}`);

    console.log("Transaction validated. The player has been sent to your wallet.");
  } catch (error) {
    console.error("Error during mint process:", error);
  }
}

// Helper: Fetch player data from Footium API
async function fetchPlayerData(playerId: string) {
  const query = `
    query getPlayerMetadata($where: PlayerWhereUniqueInput!) {
      player(where: $where) {
        id
        rarity
      }
    }
  `;
  try {
    const response = await axios.post("https://live.api.footium.club/api/graphql", {
      query,
      variables: { where: { id: playerId } },
    });
    return response.data?.data?.player || null;
  } catch (error) {
    console.error("Error fetching player data:", error);
    return null;
  }
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

// Run the test function
testMint();
