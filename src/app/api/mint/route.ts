import { ethers, Interface } from "ethers";
import { parseEther, JsonRpcProvider } from "ethers";
import axios from "axios";
import { NextResponse } from "next/server";

// Constants
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
];
const EVENT_ABI = [
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
const RPC_URL = process.env.ARBITRUM_RPC_URL as string;
const PRIVATE_KEY = process.env.HIGH_DIV_PRIV_KEY as string;

const DIVISION_MAPPING: Record<string, bigint> = { // my personal selected div prices
  div1: ethers.parseEther("0.120"),
  div2: ethers.parseEther("0.0900"),
  div3: ethers.parseEther("0.0502"),
  div4: ethers.parseEther("0.0292"), 
  div5: ethers.parseEther("0.0173"),
  div6: ethers.parseEther("0.0123"),
  div7: ethers.parseEther("0.0080"),
  div8: ethers.parseEther("0.0055"),
};

// Delay function to compensate for slow network
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// API Route Handler
export async function POST(req: Request) {
  const body = await req.json();
  console.log("Received data from frontend:", body);
  const { user, txHash, amountSent, mintPrice, playerId, clubId, recipient, div, rarity } = body;

  const provider = new JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const mintContract = new ethers.Contract(MINT_CONTRACT_ADDRESS, MINT_CONTRACT_ABI, wallet);
  const nftContract = new ethers.Contract(SEND_NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, wallet);

  try {
    // Step 1: Verify values locally
    let expectedAmountSent = DIVISION_MAPPING[div];
    if (rarity === "Rare") {
      expectedAmountSent = ethers.parseEther("0.192"); // rare override
    }

    console.log("Comparing the following values:");
    console.log("Frontend amountSent:", amountSent);
    console.log("Backend expectedAmountSent:", ethers.formatEther(expectedAmountSent));
    console.log("Frontend amountSent (parsed):", ethers.parseEther(amountSent).toString());
    console.log("Backend expectedAmountSent (parsed):", expectedAmountSent.toString());
    
    // Compare parsed values
    if (ethers.parseEther(amountSent).toString() !== expectedAmountSent.toString()) {
      console.error("Mismatch detected:");
      console.error("Frontend amountSent:", ethers.parseEther(amountSent).toString());
      console.error("Backend expectedAmountSent:", expectedAmountSent.toString());
      return NextResponse.json(
        { error: "Amount sent does not match expected value." },
        { status: 400 }
      );
    }
    
    console.log("Local verification passed.");
    

        // Step 1.5: Verify on-chain transaction
        const txReceipt = await provider.getTransactionReceipt(txHash);
        if (!txReceipt) {
          return NextResponse.json({ error: "Transaction hash not found on-chain." }, { status: 400 });
        }
    
        const tx = await provider.getTransaction(txHash);
        if (!tx) {
          return NextResponse.json({ error: "Transaction not found on-chain." }, { status: 400 });
        }
    
        const onChainAmountSent = tx.value;
        console.log("On-chain transaction details:");
        console.log("On-chain amount sent:", ethers.formatEther(onChainAmountSent));
        console.log("Expected amount sent:", ethers.formatEther(expectedAmountSent));
    
        if (onChainAmountSent.toString() !== expectedAmountSent.toString()) {
          return NextResponse.json({ error: "On-chain amount does not match expected value." }, { status: 400 });
        }
    
        console.log("On-chain verification passed.");

    // Step 2: Fetch Merkle proof
    const mintProof = await fetchMerkleProof(playerId);
    if (!mintProof) {
      return NextResponse.json({ error: "Failed to fetch Merkle proof." }, { status: 400 });
    }

    // Step 3: Send mint transaction
    const mintTx = await mintContract.mintPlayer(clubId, playerId, mintProof, {
      value: parseEther(mintPrice),
      gasLimit: 4000000,
    });

    let receipt = null;
    while (!receipt) {
      receipt = await provider.getTransactionReceipt(mintTx.hash);
      if (!receipt) await delay(2000);
    }

    // Step 4: Decode logs

    const decodedEvents = await decodeEventLogs(mintTx.hash, EVENT_ABI);
    if (!decodedEvents || decodedEvents.length === 0) {
      return NextResponse.json({ error: "No events found or failed to decode logs." }, { status: 400 });
    }

    const academyPlayerMintedEvent = decodedEvents.find((event) => event.name === "AcademyPlayerMinted");
    if (!academyPlayerMintedEvent) {
      return NextResponse.json({ error: "AcademyPlayerMinted event not found in logs." }, { status: 400 });
    }

    const tokenId = academyPlayerMintedEvent.args?.assetId?.toString();
    if (!tokenId) {
      return NextResponse.json({ error: "Token ID not found in transaction logs." }, { status: 400 });
    }

    console.log("Token minted successfully:", tokenId);


    // Step 6: Transfer NFT
    const transferTx = await nftContract.transferFrom(wallet.address, recipient, tokenId);
    await transferTx.wait();

    return NextResponse.json({ message: "Mint and transfer successful", tokenId });
  } catch (error: any) {
    console.error("Error during mint process:", error);
    return NextResponse.json({ error: error.message || "Transaction failed" }, { status: 500 });
  }
}

// Helper: Fetch Merkle proof
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
