window.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("tree-container");
  const status = document.getElementById("status");

  const setStatus = (msg) => { if (status) status.textContent = msg || ""; };

  try {
    if (!container) throw new Error("Nem találom a #tree-container elemet.");
    if (!window.d3) throw new Error("A D3 nem töltődött be (CDN hiba vagy nincs internet).");

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 600;

    const svg = d3.select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g");

    const zoom = d3.zoom()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));

    svg.call(zoom);

    const res = await fetch("./data.json?v=2", { cache: "no-store" });
    if (!res.ok) throw new Error(`A data.json nem tölthető be (HTTP ${res.status}).`);
    const data = await res.json();

    const root = d3.hierarchy(data);
    const treeLayout = d3.tree().nodeSize([130, 170]);
    treeLayout(root);

    // Links
    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d3.linkVertical().x(d => d.x).y(d => d.y));

    // Nodes
    const node = g.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`);

    // 1) Rect placeholder (majd méretre állítjuk)
    const rect = node.append("rect")
      .attr("y", -16)
      .attr("height", 32)
      .attr("rx", 8);

    // 2) Text: BALRA IGAZÍTOTT, DE MI TESSZÜK KÖZÉPRE a dobozon belül (x-et számolunk)
    const text = node.append("text")
      .attr("y", 0)
      .attr("dy", "0.35em")
      .attr("text-anchor", "start") // fontos: így kiszámítható az x
      .text(d => d.data.name ?? "");

    // 3) Méretezés + pozicionálás: a doboz középre, a szöveg belülre (paddinggel)
    const MIN_W = 120;
    const PAD_X = 18;

    node.each(function () {
      const n = d3.select(this);
      const t = n.select("text").node();

      let textW = 0;
      try { textW = t ? t.getComputedTextLength() : 0; } catch { textW = 0; }

      const boxW = Math.max(MIN_W, textW + PAD_X * 2);

      // doboz középre
      n.select("rect")
        .attr("x", -boxW / 2)
        .attr("width", boxW);

      // szöveg balról induljon, de a doboz bal belső szélétől
      n.select("text")
        .attr("x", -boxW / 2 + PAD_X);
    });

    // Auto-fit / center
    const bounds = g.node().getBBox();
    const padding = 60;

    const scale = Math.min(
      (width - padding) / bounds.width,
      (height - padding) / bounds.height
    );

    const clampedScale = Math.max(0.25, Math.min(2.0, scale));

    const translateX = (width - bounds.width * clampedScale) / 2 - bounds.x * clampedScale;
    const translateY = (height - bounds.height * clampedScale) / 2 - bounds.y * clampedScale;

    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(translateX, translateY).scale(clampedScale)
    );

    setStatus("");
  } catch (err) {
    console.error(err);
    setStatus(`Hiba: ${err?.message || String(err)}`);
  }
});
