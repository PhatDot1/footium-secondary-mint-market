"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { MetaMaskSDK } from "@metamask/sdk";
import axios from "axios";

type Player = {
  id: string;
  card: string;
  leadership: number;
  stamina: number;
  div: string;
  divValue: string;
  rarity: string;
};

const MMSDK = new MetaMaskSDK({
  dappMetadata: {
    name: "Footium Dapp",
    url: window.location.href,
  },
});

const ethereum = MMSDK.getProvider();

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
  
    // Define mint price mapping
    const MINT_PRICE_MAPPING: Record<string, string> = {
      Div1: "0.0980",
      Div2: "0.0713",
      Div3: "0.0401",
      Div4: "0.0241",
      Div5: "0.0216",  // actually 0.0143 but temp set to 0.0216 for testing
      Div6: "0.0103",
      Div7: "0.0063",
      Div8: "0.0034",
    };
  
    try {
      // Determine the mint price
      const mintPrice = player.rarity === "Rare"
        ? ethers.parseEther("0.154") // Override for rare players
        : ethers.parseEther(MINT_PRICE_MAPPING[player.div.replace("Div", "")] || "0");
  
      // Extract player parameters
      const clubId = parseInt(player.id.split("-")[1]); // Extract clubId from playerId
      const playerId = player.id;
      const recipient = account;
  
      // Initialize provider and contract
      const provider = new ethers.BrowserProvider(ethereum as any);
      const signer = await provider.getSigner();
  
      const contractAddress = "0xF164FD933606D0F8b2361ebC0083843FD9177faB";
      const abi = [
        "function receiveFunds(uint256 mintPrice, uint256 clubId, string playerId, address recipient) external payable",
      ];
      const contract = new ethers.Contract(contractAddress, abi, signer);
  
      // Send the transaction
      const tx = await contract.receiveFunds(mintPrice, clubId, playerId, recipient, {
        value: mintPrice, // Pass the mint price as msg.value
      });
  
      await tx.wait();
      alert(`Mint successful! Transaction Hash: ${tx.hash}`);
    } catch (error) {
      console.error("Error minting player:", error);
      alert("Mint failed. Check console for details.");
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
