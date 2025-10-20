async function loadJSON(url) {
  const res = await fetch(url);
  return await res.json();
}

async function fetchMarketPrices() {
  const data = await loadJSON("prices.json");
  return data?.data?.p2p || {};
}

function calculateProfit(seeds, prices, coinRate, multiplier, modifiers) {
  const rate = coinRate / 1000;
  const results = [];

  for (const s of seeds) {
    const sellPrice = prices[s.name];
    if (!sellPrice) continue;

    const mod = modifiers.find((m) => m.item === s.name);

    const modPrice = mod && mod.seed > 0 ? mod.seed : s.price;
    const modYield = mod && mod.yield > 0 ? mod.yield : s.yield ?? 1;
    const modSeconds = mod && mod.time > 0 ? mod.time : s.seconds;

    const seedCost = modPrice * rate;
    const totalSell = sellPrice * modYield * multiplier;
    const profit = totalSell - seedCost;
    const profitPerMin = profit / (modSeconds / 60);

    results.push({
      name: s.name,
      seedCost,
      sellPrice,
      profit,
      profitPerMin,
      seconds: Math.round(modSeconds),
    });
  }

  results.sort((a, b) => b.profitPerMin - a.profitPerMin);
  return results;
}

function renderTable(data, containerId) {
  let html = `
  <div class="table-responsive">
    <table class="table table-striped align-middle">
      <thead>
        <tr>
          <th>#</th>
          <th>Item</th>
          <th>Seed Cost (flower)</th>
          <th>Sell Price (flower)</th>
          <th>Profit/Pick (flower)</th>
          <th>Time (s)</th>
          <th>Profit/min (flower)</th>
        </tr>
      </thead>
      <tbody>
  `;

  data.forEach((item, i) => {
    html += `
    <tr>
      <td>${i + 1}</td>
      <td>${item.name}</td>
      <td>${item.seedCost.toFixed(6)}</td>
      <td>${item.sellPrice.toFixed(6)}</td>
      <td class="profit-positive">${item.profit.toFixed(6)}</td>
      <td>${item.seconds}</td>
      <td class="profit-positive">${item.profitPerMin.toFixed(6)}</td>
    </tr>`;
  });

  html += "</tbody></table></div>";
  document.getElementById(containerId).innerHTML = html;
}

async function loadData() {
  document.getElementById("cropTableContainer").innerHTML =
    "<div class='text-center text-muted p-3'>Loading crops...</div>";
  document.getElementById("fruitTableContainer").innerHTML =
    "<div class='text-center text-muted p-3'>Loading fruits...</div>";

  const [cropSeeds, fruitSeeds, prices] = await Promise.all([
    loadJSON("crops.json"),
    loadJSON("fruits.json"),
    fetchMarketPrices(),
  ]);

  const coinRate = parseFloat(document.getElementById("coinRate").value);
  const cropMult = parseFloat(document.getElementById("cropMult").value);
  const fruitMult = parseFloat(document.getElementById("fruitMult").value);

  const modifiers = getModifiers();

  const cropData = calculateProfit(
    cropSeeds,
    prices,
    coinRate,
    cropMult,
    modifiers
  );
  const fruitData = calculateProfit(
    fruitSeeds,
    prices,
    coinRate,
    fruitMult,
    modifiers
  );

  renderTable(cropData, "cropTableContainer");
  renderTable(fruitData, "fruitTableContainer");
}

// 🔧 Settings panel toggle (fixed first click issue)
const panel = document.getElementById("settingsPanel");
panel.style.display = "none"; // initial hidden state

document.getElementById("toggleSettings").addEventListener("click", () => {
  if (panel.style.display === "none" || panel.style.display === "") {
    panel.style.display = "block";
  } else {
    panel.style.display = "none";
  }
});

// ➕ Add modifier
document.getElementById("addModifier").addEventListener("click", async () => {
  const [crops, fruits] = await Promise.all([
    loadJSON("crops.json"),
    loadJSON("fruits.json"),
  ]);
  const items = [...crops, ...fruits];

  const div = document.createElement("div");
  div.className = "border p-2 mb-2 rounded";

  const options = items
    .map((i) => `<option value="${i.name}">${i.name}</option>`)
    .join("");

  div.innerHTML = `
    <div class="row g-2 align-items-center">
      <div class="col-md-3">
        <select class="form-select item-select">${options}</select>
      </div>
      <div class="col-md-3">
        <input type="number" class="form-control seed" placeholder="Seed cost (coin)" />
      </div>
      <div class="col-md-3">
        <input type="number" class="form-control yield" placeholder="Yield (items)" step="0.1" />
      </div>
      <div class="col-md-2">
        <input type="number" class="form-control time" placeholder="Grow time (sec)" />
      </div>
      <div class="col-md-1 text-end">
        <button class="btn btn-danger btn-sm remove">❌</button>
      </div>
    </div>
  `;

  div.querySelector(".remove").addEventListener("click", () => div.remove());
  document.getElementById("modifiersContainer").appendChild(div);
});

function getModifiers() {
  return Array.from(document.querySelectorAll("#modifiersContainer > div")).map(
    (div) => ({
      item: div.querySelector(".item-select").value,
      seed: parseFloat(div.querySelector(".seed").value) || 0,
      yield: parseFloat(div.querySelector(".yield").value) || 0,
      time: parseFloat(div.querySelector(".time").value) || 0,
    })
  );
}

document.getElementById("recalc").addEventListener("click", loadData);

// 💡 Recalculate when pressing Enter
document.querySelectorAll("#settingsPanel input").forEach((input) => {
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") loadData();
  });
});

// 📝 Append notes at the bottom of settings panel
const notes = document.createElement("div");
notes.className = "mt-3 small text-muted border-top pt-2";
notes.innerHTML = `
  <strong>Notes:</strong><br>
  • Default price of 1000 coins equals <b>0.5 flowers</b>, based on average delivery rate.<br>
  • Crop/Fruit multipliers can be used to calculate profit according to the number of plots.
`;
panel.appendChild(notes);

loadData();
