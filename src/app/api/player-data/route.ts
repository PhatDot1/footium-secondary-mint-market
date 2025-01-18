import { NextResponse } from "next/server";
import axios from "axios";

const GRAPHQL_ENDPOINT = "https://live.api.footium.club/api/graphql";
const OPENSEA_API_ENDPOINT = "https://api.opensea.io/api/v2/chain/arbitrum/account/{wallet_address}/nfts";

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

async function getNftTokenIds(apiKey: string, walletAddress: string, collectionSlug: string) {
  const url = OPENSEA_API_ENDPOINT.replace("{wallet_address}", walletAddress);
  const headers = {
    accept: "application/json",
    "x-api-key": apiKey,
  };
  const params = { collection: collectionSlug, limit: 200 };

  try {
    const response = await axios.get(url, { headers, params });
    return response.data?.nfts?.map((nft: any) => nft.identifier) || [];
  } catch (error) {
    console.error("Error fetching NFTs:", error);
    return [];
  }
}

async function getPlayerData(playerId: string) {
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

    const clubId = player.club?.id || null;
    const division = DIVISION_MAPPING[clubId] || "unknown";
    let divisionValue = DIVISION_MAPPING[division] || "unknown";

    // Override divValue if rarity is "Rare"
    if (player.rarity === "Rare") {
      divisionValue = "0.192 ETH";
    }

    return {
      id: player.id,
      card: player.imageUrls?.card,
      leadership: player.playerAttributes?.[0]?.leadership,
      stamina: player.playerAttributes?.[0]?.stamina,
      rarity: player.rarity,
      div: division,
      divValue: divisionValue,
    };
  } catch (error) {
    console.error(`Error fetching data for player ID ${playerId}:`, error);
    return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const walletAddress = url.searchParams.get("walletAddress");
  const collectionSlug = url.searchParams.get("collectionSlug");
  const apiKey = process.env.OPENSEA_API_KEY;

  if (!walletAddress || !collectionSlug || !apiKey) {
    return NextResponse.json({ error: "Missing parameters or API key" }, { status: 400 });
  }

  const nftTokenIds = await getNftTokenIds(apiKey, walletAddress, collectionSlug);
  const allPlayerData = [];

  for (const tokenId of nftTokenIds) {
    for (let x = 0; x < 7; x++) {
      const playerId = `5-${tokenId}-${x}`;
      const playerData = await getPlayerData(playerId);
      if (playerData) allPlayerData.push(playerData);
    }
  }

  return NextResponse.json(allPlayerData);
}
