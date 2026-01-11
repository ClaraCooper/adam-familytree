window.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("tree-container");
  const status = document.getElementById("status");

  const setStatus = (msg) => { if (status) status.textContent = msg || ""; };

  try {
    if (!window.d3) throw new Error("A D3 nem töltődött be (CDN hiba vagy nincs internet).");

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 600;

    const svg = d3.select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g");

    // Zoom viselkedés
    const zoom = d3.zoom()
      .scaleExtent([0.2, 4]) // min/max zoom
      .on("zoom", (event) => g.attr("transform", event.transform));

    svg.call(zoom);

    // Adatok betöltése
    const res = await fetch("./data.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`A data.json nem tölthető be (HTTP ${res.status}).`);
    const data = await res.json();

    // Layout
    const root = d3.hierarchy(data);
    const treeLayout = d3.tree().nodeSize([110, 160]);
    treeLayout(root);

    // Linkek
    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d3.linkVertical().x(d => d.x).y(d => d.y));

    // Node-ok
    const node = g.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`);

    node.append("rect")
      .attr("x", -60).attr("y", -16)
      .attr("width", 120).attr("height", 32)
      .attr("rx", 8);

    node.append("text")
      .attr("dy", 5)
      .text(d => d.data.name);

    // ✅ AUTO-FIT / AUTO-CENTER
    // Kiszámoljuk a teljes fa "bounding box"-át, és ráillesztjük a képernyőre.
    const bounds = g.node().getBBox();
    const fullWidth = bounds.width;
    const fullHeight = bounds.height;

    // Biztonsági padding, hogy ne érjen a széléhez
    const padding = 40;

    const scale = Math.min(
      (width - padding) / fullWidth,
      (height - padding) / fullHeight
    );

    const clampedScale = Math.max(0.2, Math.min(2, scale)); // ésszerű korlátok

    // Középre igazítás
    const translateX = (width - fullWidth * clampedScale) / 2 - bounds.x * clampedScale;
    const translateY = (height - fullHeight * clampedScale) / 2 - bounds.y * clampedScale;

    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(translateX, translateY).scale(clampedScale)
    );

    setStatus(""); // ok
  } catch (err) {
    console.error(err);
    setStatus(`Hiba: ${err.message || String(err)}`);
  }
});
