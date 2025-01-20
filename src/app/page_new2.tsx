"use client";

import type { MetaMaskInpageProvider } from "@metamask/providers";
import { useEffect, useState } from "react";
import { ethers, BrowserProvider } from "ethers";  // Explicitly import 'providers'
import { MetaMaskSDK } from "@metamask/sdk";
import axios from "axios";


const abi = [
  "function receiveFunds(uint256 mintPrice, uint256 clubId, string calldata playerId, address recipient) external payable",
];

interface Window {
  ethereum?: any;
}
declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}

type ReceiveFundsFunction = (
  mintPrice: ethers.BigNumberish,
  clubId: number,
  playerId: string,
  recipient: string,
  overrides: { value: ethers.BigNumberish; gasLimit?: ethers.BigNumberish }
) => Promise<ethers.TransactionResponse>;

type Player = {
  id: string;
  card: string;
  leadership: number;
  stamina: number;
  div: string;
  divValue: string;
  rarity: string;
  mintPrice?: string; // Added mintPrice field
};

const MMSDK = new MetaMaskSDK({
  dappMetadata: {
    name: "Footium Dapp",
    url: window.location.href,
  },
});

const ethereum = MMSDK.getProvider() || window.ethereum;

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const walletAddress = "0xCE1c0e4E2356AD252F626d348d7c5778a264446C";
        const collectionSlug = "footium-clubs";
        const response = await axios.get(`/api/player-data`, {
          params: { walletAddress, collectionSlug },
        });
        setPlayers(
          response.data.map((player: any) => ({
            ...player,
            mintPrice: player.mintPrice, // Use mintPrice directly from backend
          }))
        );
      } catch (error) {
        console.error("Error fetching player data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  const connectWallet = async () => {
    try {
      const accounts = await MMSDK.connect();
      setAccount(accounts[0]);
      console.log("Connected account:", accounts[0]);
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };



  const handleMint = async (player: Player) => {
    if (!account) {
      alert("Please connect your wallet first!");
      return;
    }
  
    try {
      // Use mintPrice directly from backend
      const mintPrice = ethers.parseEther(player.mintPrice || "0");
  
      // Extract player parameters
      const clubId = parseInt(player.id.split("-")[1]); // Club ID extracted from Player ID
      const playerId = player.id; // Full Player ID
      const recipient = account; // User's wallet address
  
      // Initialize MetaMask provider and signer using Web3Provider (standard for MetaMask interaction)
      if (!ethereum) {
        alert("MetaMask is not available. Please install MetaMask!");
        return;
      }
      
      const provider = new BrowserProvider(ethereum);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        "0xF164FD933606D0F8b2361ebC0083843FD9177faB", // Contract address
        abi,
        signer
      );
  
      // Call the contract method using the contract instance
      const txResponse = await contract.receiveFunds(
        mintPrice,
        clubId,
        playerId,
        recipient,
        {
          value: mintPrice, // The value in ETH to send
          gasLimit: 600000, // Gas limit
        }
      );
  
      console.log(`Transaction sent! Hash: ${txResponse.hash}`);
  
      // Wait for the transaction to be confirmed
      const receipt = await txResponse.wait();
      console.log("Transaction confirmed:", receipt);
  
      alert(`Mint successful! Transaction Hash: ${txResponse.hash}`);
    } catch (error: any) {
      console.error("Error minting player:", error);
      alert(`Mint failed: ${error.message || error}`);
    }
  };

  



  if (loading) return <p>Loading UTD Academy...</p>;

  return (
    <div>
      <h1>Footium Players</h1>
      {!account ? (
        <button
          onClick={connectWallet}
          style={{
            margin: "16px 0",
            padding: "10px 20px",
            backgroundColor: "#007BFF",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          Connect Wallet
        </button>
      ) : (
        <p>Connected Wallet: {account}</p>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px",
        }}
      >
        {players.map((player) => (
          <div
            key={player.id}
            style={{
              border: "1px solid #ccc",
              padding: "16px",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <img
              src={player.card}
              alt={`Player ${player.id}`}
              style={{ width: "100%", marginBottom: "16px" }}
            />
            <p>
              <strong>Leadership:</strong> {player.leadership}
            </p>
            <p>
              <strong>Stamina:</strong> {player.stamina}
            </p>
            <p>
              <strong>Division:</strong> {player.div}
            </p>
            <p>
              <strong>Value:</strong> {player.divValue}
            </p>
            <p>
              <strong>Rarity:</strong> {player.rarity}
            </p>
            <button
              onClick={() => handleMint(player)}
              style={{
                display: "block",
                margin: "16px auto 0",
                padding: "10px 20px",
                backgroundColor: "#007BFF",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              Mint
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
