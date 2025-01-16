import { NextResponse } from "next/server";

const DIV_MINT_VALUES: Record<string, string> = {
  div1: "0.0980 ETH",
  div2: "0.0713 ETH",
  div3: "0.0401 ETH",
  div4: "0.0241 ETH",
  div5: "0.0143 ETH",
  div6: "0.0103 ETH",
  div7: "0.0063 ETH",
  div8: "0.0034 ETH",
};

export async function POST(req: Request) {
  try {
    const { division, rarity } = await req.json();

    if (!division || !rarity) {
      return NextResponse.json(
        { error: "Missing required fields: division or rarity" },
        { status: 400 }
      );
    }

    let mintValue = DIV_MINT_VALUES[division] || "unknown";

    // Override mint value if rarity is Rare
    if (rarity === "Rare") {
      mintValue = "0.154 ETH";
    }

    return NextResponse.json({
      message: "Mint initiated successfully.",
      mintValue,
      division,
      rarity,
    });
  } catch (error) {
    console.error("Error in minting API:", error);
    return NextResponse.json({ error: "Mint failed" }, { status: 500 });
  }
}
