import { NextResponse } from "next/server";
import axios from "axios";

const GRAPHQL_ENDPOINT = "https://live.api.footium.club/api/graphql";
const OPENSEA_API_ENDPOINT = "https://api.opensea.io/api/v2/chain/arbitrum/account/{wallet_address}/nfts";
const COLLECTION_SLUG = "footium-clubs";

// Type definition for the player
interface Player {
  id: string;
  imageUrls: {
    card: string;
  };
  mintPrice: number;
  rarity?: string;
  playerAttributes?: {
    leadership: number;
    stamina: number;
  };
  club?: {
    id: number;
    name: string;
  };
}

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
  "div1": "0.0120 ETH",
  "div2": "0.0900 ETH",
  "div3": "0.0502 ETH",
  "div4": "0.0292 ETH",
  "div5": "0.0173 ETH",
  "div6": "0.0123 ETH",
  "div7": "0.0080 ETH",
  "div8": "0.0055 ETH",
};

async function getNftTokenIds(apiKey: string, walletAddress: string) {
  const url = OPENSEA_API_ENDPOINT.replace("{wallet_address}", walletAddress);
  const headers = {
    accept: "application/json",
    "x-api-key": apiKey,
  };
  const params = { collection: COLLECTION_SLUG, limit: 200 };

  try {
    const response = await axios.get(url, { headers, params });
    return response.data?.nfts || [];
  } catch (error) {
    console.error("Error fetching NFTs:", error);
    return [];
  }
}

async function getPlayersByClubId(clubId: number) {
  const query = `
    query {
      players(
        where: {
          clubId: { equals: ${clubId} }
          isReserve: { equals: false }
          isAcademy: { equals: true }
        }
        orderBy: { id: desc }
        take: 10
      ) {
        id
        imageUrls {
          card
        }
        mintPrice
      }
    }
  `;

  try {
    const response = await axios.post(GRAPHQL_ENDPOINT, { query });
    return response.data?.data?.players || [];
  } catch (error) {
    console.error(`Error fetching players for club ID ${clubId}:`, error);
    return [];
  }
}

async function getPlayerDetails(playerId: string) {
  const query = `
    query getPlayerMetadata($where: PlayerWhereUniqueInput!) {
      player(where: $where) {
        id
        rarity
        club {
          id
          name
        }
        playerAttributes {
          leadership
          stamina
        }
        imageUrls {
          card
        }
      }
    }
  `;
  const variables = { where: { id: playerId } };

  try {
    const response = await axios.post(GRAPHQL_ENDPOINT, { query, variables });
    const player = response.data?.data?.player;

    if (!player) return null;

    // Determine division and division value
    const clubId = player.club?.id || null;
    const division = DIVISION_MAPPING[clubId] || "unknown";
    let divisionValue = DIVISION_MAPPING[division] || "unknown";

    // Override divValue if rarity is "Rare"
    if (player.rarity === "Rare") {
      divisionValue = "0.192 ETH";
    }

    return {
      id: player.id,
      rarity: player.rarity,
      leadership: player.playerAttributes?.[0]?.leadership,
      stamina: player.playerAttributes?.[0]?.stamina,
      card: player.imageUrls?.card,
      div: division,
      divValue: divisionValue,
    };
  } catch (error) {
    console.error(`Error fetching details for player ID ${playerId}:`, error);
    return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const walletAddress = url.searchParams.get("walletAddress");
  const apiKey = process.env.OPENSEA_API_KEY;

  if (!walletAddress || !apiKey) {
    return NextResponse.json({ error: "Missing parameters or API key" }, { status: 400 });
  }

  // Fetch the NFTs owned by the wallet address
  const nftData = await getNftTokenIds(apiKey, walletAddress);
  const allPlayerData = [];

  for (const nft of nftData) {
    const clubId = parseInt(nft.identifier); // Using the NFT's identifier as the club ID

    // Step 1: Get players by clubId
    const playersByClub: Player[] = await getPlayersByClubId(clubId);

    // Step 2: Filter players and keep the ones with the highest player ID (based on the format x-yab-z)
    const highestIdPlayers = playersByClub.filter((player) => player.id.startsWith("6"));
    
    // Step 3: Fetch full details for each player
    for (const player of highestIdPlayers) {
      const playerDetails = await getPlayerDetails(player.id);
      if (playerDetails) {
        allPlayerData.push({
          ...playerDetails,
          card: player.imageUrls?.card, // Keep image URL from the club query
          mintPrice: player.mintPrice, // Include mintPrice for backend use
        });
      }
    }
  }

  return NextResponse.json(allPlayerData);
}
