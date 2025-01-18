import { ethers } from "ethers";

// Constants
const RPC_URL = process.env.ARBITRUM_RPC_URL as string;
const PRIVATE_KEY = process.env.HIGH_DIV_PRIV_KEY as string;

const NFT_CONTRACT_ADDRESS = "0x1c7b75ffef2ffab57d4a9727003bcd602f978bce"; // Replace with your NFT contract address
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

const TOKEN_ID = 96165; // Replace with your token ID
const RECIPIENT = "0x1fF116257e646b6C0220a049e893e81DE87fc475"; // Replace with the recipient address

async function directTransferNFT() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, wallet);

  try {
    console.log("Checking NFT ownership...");
    const owner = await contract.ownerOf(TOKEN_ID);
    console.log(`Owner of token ${TOKEN_ID}: ${owner}`);

    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
      console.error("The wallet does not own this token.");
      return;
    }

    console.log("Transferring NFT...");
    const transferTx = await contract.transferFrom(wallet.address, RECIPIENT, TOKEN_ID);
    console.log(`Transaction sent. Hash: ${transferTx.hash}`);

    const transferReceipt = await transferTx.wait();
    console.log("NFT transfer confirmed.");
    console.log(`Confirmed Transaction Hash: ${transferTx.hash}`); // Use transferTx.hash
  } catch (error) {
    console.error("Error during NFT transfer:", error);
  }
}

directTransferNFT();
