"use client"

import { useEffect, useState } from "react"
import { ethers, BrowserProvider, parseEther } from "ethers"
import Web3Modal from "web3modal"
import axios from "axios"
import Link from "next/link"
import "./styles/custom.css"

const abi = [
  "function receiveFunds(uint256 mintPrice, uint256 clubId, string calldata playerId, address recipient) external payable",
]

type Player = {
  id: string
  card: string
  leadership: number
  stamina: number
  div: string
  divValue: string
  rarity: string
}

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState<string | null>(null)
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [web3Modal, setWeb3Modal] = useState<Web3Modal | null>(null)
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null)

  useEffect(() => {
    const newWeb3Modal = new Web3Modal()
    setWeb3Modal(newWeb3Modal)

    const fetchPlayers = async () => {
      try {
        const walletAddress = "0xCE1c0e4E2356AD252F626d348d7c5778a264446C"
        const collectionSlug = "footium-clubs"
        const response = await axios.get(`/api/player-data`, {
          params: { walletAddress, collectionSlug },
        })
        setPlayers(response.data)
        setFilteredPlayers(response.data)
      } catch (error) {
        console.error("Error fetching player data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [])

  useEffect(() => {
    if (selectedRarity) {
      const filtered = players.filter((player) => player.rarity === selectedRarity)
      setFilteredPlayers(filtered)
    } else {
      setFilteredPlayers(players)
    }
  }, [selectedRarity, players])

  const connectWallet = async () => {
    try {
      if (web3Modal) {
        const instance = await web3Modal.connect()
        const web3Provider = new BrowserProvider(instance)
        const signer = await web3Provider.getSigner()
        const userAccount = await signer.getAddress()

        setProvider(web3Provider)
        setAccount(userAccount)

        const userBalance = await web3Provider.getBalance(userAccount)
        setBalance(ethers.formatEther(userBalance))

        console.log("Connected account:", userAccount)
      }
    } catch (error) {
      console.error("Error connecting wallet:", error)
    }
  }

  const disconnectWallet = async () => {
    try {
      if (web3Modal) {
        await web3Modal.clearCachedProvider()
        setAccount(null)
        setProvider(null)
        setBalance(null)
        console.log("Wallet disconnected")
      }
    } catch (error) {
      console.error("Error disconnecting wallet:", error)
    }
  }

  const handleBuy = async (player: Player) => {
    if (!account || !provider) {
      alert("Please connect your wallet first!")
      return
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
    }

    try {
      const mintPrice = parseEther(player.rarity === "Rare" ? "0.0180" : MINT_PRICE_MAPPING[player.div.toLowerCase()])
      const value = parseEther(player.divValue)

      const clubId = Number.parseInt(player.id.split("-")[1])
      const playerId = player.id
      const recipient = account

      console.log("Attempting to mint with the following parameters:", {
        mintPrice: ethers.formatEther(mintPrice),
        value: ethers.formatEther(value),
        clubId,
        playerId,
        recipient,
      })

      const contractAddress = "0xF164FD933606D0F8b2361ebC0083843FD9177faB"
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(contractAddress, abi, signer)

      const tx = await contract.receiveFunds(mintPrice, clubId, playerId, recipient, {
        value,
        gasLimit: 300000,
      })

      console.log(`Transaction sent! Hash: ${tx.hash}`)

      const receipt = await tx.wait()
      console.log("Transaction confirmed:", receipt)

      alert(`Transaction successful! Transaction Hash: ${tx.hash}`)
    } catch (error: any) {
      console.error("Error processing the transaction:", error)
      alert(`Transaction failed: ${error.message || error}`)
    }
  }

  const rarities = Array.from(new Set(players.map((player) => player.rarity)))

  if (loading) return <p className="text-white">Loading UTD Academy...</p>

  return (
    <div className="min-h-screen">
      <header className="header sticky top-0 z-10">
        <div className="logo-container">
          <svg width="52" height="40" viewBox="0 0 52 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M18.5372 0C15.9716 0.000704449 13.4807 0.875348 11.4657 2.48314C9.45069 4.09094 8.02868 6.33836 7.42857 8.86365L0 40H33.4628C36.0281 39.9992 38.5185 39.1244 40.5331 37.5166C42.5476 35.9088 43.9691 33.6614 44.5687 31.1363L52 0H18.5372ZM37.2961 14.0129H24.9835L23.6155 19.223H32.8471L31.107 25.5938H21.9437L19.7548 33.9699H11.9705L17.6589 12.1875C18.3566 9.51458 20.8438 7.64213 23.6948 7.64213H38.9788L37.2961 14.0129Z"
              fill="url(#paint0_linear_509_3108)"
            />
            <defs>
              <linearGradient id="paint0_linear_509_3108" x1="26" y1="0" x2="26" y2="40" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3E4DE5" />
                <stop offset="1" stopColor="#2835BA" />
              </linearGradient>
            </defs>
          </svg>
          <h1 className="text-white text-2xl font-bold">Footium Players</h1>
        </div>
        {!account ? (
          <button className="button" onClick={connectWallet}>
            Connect Wallet
          </button>
        ) : (
          <button className="wallet-button" onClick={disconnectWallet}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
              <g fill="none" fillRule="evenodd">
                <circle cx="16" cy="16" r="16" fill="#627EEA" />
                <g fill="#FFF" fillRule="nonzero">
                  <path fillOpacity=".602" d="M16.498 4v8.87l7.497 3.35z" />
                  <path d="M16.498 4L9 16.22l7.498-3.35z" />
                  <path fillOpacity=".602" d="M16.498 21.968v6.027L24 17.616z" />
                  <path d="M16.498 27.995v-6.028L9 17.616z" />
                  <path fillOpacity=".2" d="M16.498 20.573l7.497-4.353-7.497-3.348z" />
                  <path fillOpacity=".602" d="M9 16.22l7.498 4.353v-7.701z" />
                </g>
              </g>
            </svg>
            <p className="balance">{Number.parseFloat(balance || "0").toFixed(4)}</p>
            <p className="account">{account.slice(0, 8)}...</p>
            <svg viewBox="0 0 24 24" focusable="false" className="disconnect-icon">
              <path
                d="m21.017 9.565-3.265-3.324a.834.834 0 0 0-1.18.01.865.865 0 0 0-.01 1.202l3.265 3.324c.097.101.182.213.253.335-.013 0-.023-.007-.036-.007l-13.202.027a.834.834 0 0 0-.595.251.865.865 0 0 0 0 1.213c.157.16.372.25.595.25l13.197-.027c.024 0 .043-.012.066-.014-.075.146-.17.279-.281.396l-3.265 3.325a.859.859 0 0 0-.257.61.869.869 0 0 0 .246.613.841.841 0 0 0 .603.251.83.83 0 0 0 .598-.262l3.265-3.324A3.46 3.46 0 0 0 22 11.989a3.46 3.46 0 0 0-.986-2.424h.003Z"
                fill="currentColor"
              ></path>
              <path
                d="M8.125 20.333h-1.75a2.693 2.693 0 0 1-1.856-.732 2.441 2.441 0 0 1-.769-1.768V6.167c0-.663.277-1.3.769-1.768a2.693 2.693 0 0 1 1.856-.732h1.75a.898.898 0 0 0 .619-.244.814.814 0 0 0 .256-.59.814.814 0 0 0-.256-.589A.898.898 0 0 0 8.125 2h-1.75a4.494 4.494 0 0 0-3.092 1.222A4.074 4.074 0 0 0 2 6.167v11.666a4.074 4.074 0 0 0 1.283 2.945A4.494 4.494 0 0 0 6.375 22h1.75a.898.898 0 0 0 .619-.244.814.814 0 0 0 .256-.59.814.814 0 0 0-.256-.589.898.898 0 0 0-.619-.244Z"
                fill="currentColor"
              ></path>
            </svg>
          </button>
        )}
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="filter-container">
          <h2 className="text-xl font-semibold mb-4">Filter by Rarity</h2>
          <div className="flex flex-wrap gap-2">
            <button
              className={`filter-button ${selectedRarity === null ? "active" : ""}`}
              onClick={() => setSelectedRarity(null)}
            >
              All
            </button>
            {rarities.map((rarity) => (
              <button
                key={rarity}
                className={`filter-button ${selectedRarity === rarity ? "active" : ""}`}
                onClick={() => setSelectedRarity(rarity)}
              >
                {rarity}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {filteredPlayers.map((player) => (
            <div key={player.id} className="player-card rounded-lg overflow-hidden">
              <Link
                href={`https://footium.club/game/academy?selectedPlayerId=${player.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={player.card || "/placeholder.svg"} alt={`Player ${player.id}`} className="w-full h-auto" />
              </Link>
              <div className="p-4">
                <div className="flex justify-between mb-2">
                  <p className="font-semibold">{player.leadership} Leadership</p>
                  <p className="font-semibold">{player.stamina} Stamina</p>
                </div>
                <p className="text-center">Value: {player.divValue} ETH</p>
                <button className="button mt-4 w-full" onClick={() => handleBuy(player)}>
                  Buy
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

