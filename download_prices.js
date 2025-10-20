import fs from "fs";

async function downloadPrices() {
  const url = "https://sfl.world/api/v1/prices";
  console.log("Fetching latest prices...");

  const res = await fetch(url);
  const data = await res.json();

  fs.writeFileSync("prices.json", JSON.stringify(data, null, 2));
}

downloadPrices().catch(console.error);
