import { useEffect, useState } from "react";
import axios from "axios";

type Player = {
  id: string;
  card: string;
  leadership: number;
  stamina: number;
  div: string;
};

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Footium Players</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
        {players.map((player) => (
          <div key={player.id} style={{ border: "1px solid #ccc", padding: "16px", borderRadius: "8px" }}>
            <img src={player.card} alt={`Player ${player.id}`} style={{ width: "100%" }} />
            <p><strong>Leadership:</strong> {player.leadership}</p>
            <p><strong>Stamina:</strong> {player.stamina}</p>
            <p><strong>Division:</strong> {player.div}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
