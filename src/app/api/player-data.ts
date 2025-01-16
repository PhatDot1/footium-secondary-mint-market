
import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

const GRAPHQL_ENDPOINT = "https://live.api.footium.club/api/graphql";
const OPENSEA_API_ENDPOINT = "https://api.opensea.io/api/v2/chain/arbitrum/account/{wallet_address}/nfts";

const DIVISION_MAPPING: Record<number, string> = {
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
    return {
      id: player.id,
      card: player.imageUrls?.card,
      leadership: player.playerAttributes?.[0]?.leadership,
      stamina: player.playerAttributes?.[0]?.stamina,
      div: DIVISION_MAPPING[clubId] || "unknown",
    };
  } catch (error) {
    console.error(`Error fetching data for player ID ${playerId}:`, error);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { walletAddress, collectionSlug } = req.query as { walletAddress: string; collectionSlug: string };
  const apiKey = process.env.OPENSEA_API_KEY;

  if (!walletAddress || !collectionSlug || !apiKey) {
    return res.status(400).json({ error: "Missing parameters or API key" });
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

  return res.status(200).json(allPlayerData);
}
