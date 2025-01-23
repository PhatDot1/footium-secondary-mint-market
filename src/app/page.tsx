"use client";

import { useEffect, useState } from "react";
import { ethers, BrowserProvider, parseEther } from "ethers";
import Web3Modal from "web3modal";
import axios from "axios";

const abi = [
  "function receiveFunds(uint256 mintPrice, uint256 clubId, string calldata playerId, address recipient) external payable",
];

type Player = {
  id: string;
  card: string;
  leadership: number;
  stamina: number;
  div: string;
  divValue: string; // ETH value displayed on the frontend
  rarity: string;
};

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const walletAddress = "0xCE1c0e4E2356AD252F626d348d7c5778a264446C";
        const collectionSlug = "footium-clubs";
        const response = await axios.get(`/api/player-data`, {
          params: { walletAddress, collectionSlug },
        });
        setPlayers(response.data);
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
      const web3Modal = new Web3Modal();
      const instance = await web3Modal.connect();
      const web3Provider = new BrowserProvider(instance);
      const signer = await web3Provider.getSigner();
      const userAccount = await signer.getAddress();

      setProvider(web3Provider);
      setAccount(userAccount);

      console.log("Connected account:", userAccount);
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };

  const handleBuy = async (player: Player) => {
    if (!account || !provider) {
      alert("Please connect your wallet first!");
      return;
    }

    const MINT_PRICE_MAPPING: Record<string, string> = {
      div1: "0.0128",
      div2: "0.0112",
      div3: "0.0096",
      div4: "0.0080",
      div5: "0.0064",
      div6: "0.0048",
      div7: "0.0032",
      div8: "0.0024",
    };

    try {
      // Parse mint price (parameter) and value (transaction amount)
      const mintPrice = parseEther(
        player.rarity === "Rare" ? "0.0180" : MINT_PRICE_MAPPING[player.div.toLowerCase()]
      ); // Mint price parameter
      const value = parseEther(player.divValue); // Total value sent in the transaction

      // Extract player parameters
      const clubId = parseInt(player.id.split("-")[1]); // Club ID
      const playerId = player.id; // Full Player ID
      const recipient = account; // User's wallet address

      // Log the parameters before sending the transaction
      console.log("Attempting to mint with the following parameters:");
      console.log({
        mintPrice: ethers.formatEther(mintPrice), // Parameter only (no 'ETH' text)
        value: ethers.formatEther(value), // ETH value sent (no 'ETH' text)
        clubId,
        playerId,
        recipient,
      });

      // Get contract instance
      const contractAddress = "0xF164FD933606D0F8b2361ebC0083843FD9177faB";
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi, signer);

      // Send the transaction
      const tx = await contract.receiveFunds(mintPrice, clubId, playerId, recipient, {
        value, // Total value to send (in ETH)
        gasLimit: 300000, // Adjust gas limit as needed
      });

      console.log(`Transaction sent! Hash: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);

      alert(`Transaction successful! Transaction Hash: ${tx.hash}`);
    } catch (error: any) {
      console.error("Error processing the transaction:", error);

      // Log the exact error details
      alert(
        `Transaction failed:\n\nParameters:\nMint Price (parameter): ${
          ethers.formatEther(
            player.rarity === "Rare" ? parseEther("0.0180") : parseEther(MINT_PRICE_MAPPING[player.div.toLowerCase()])
          )
        }\nValue Sent: ${ethers.formatEther(parseEther(player.divValue))}\nClub ID: ${
          player.id.split("-")[1]
        }\nPlayer ID: ${player.id}\nRecipient: ${account}\n\nError Message: ${
          error.message || error
        }`
      );
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
              <strong>Value:</strong> {player.divValue} ETH
            </p>
            <p>
              <strong>Rarity:</strong> {player.rarity}
            </p>
            <button
              onClick={() => handleBuy(player)}
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
              Buy
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
