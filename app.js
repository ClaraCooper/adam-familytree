window.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("tree-container");
  const status = document.getElementById("status");

  const setStatus = (msg) => {
    if (status) status.textContent = msg || "";
  };

  try {
    if (!container) throw new Error("Nem találom a #tree-container elemet.");
    if (!window.d3) throw new Error("A D3 nem töltődött be (CDN hiba vagy nincs internet).");

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 600;

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g");

    // Zoom viselkedés
    const zoom = d3
      .zoom()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));

    svg.call(zoom);

    // Adatok betöltése
    const res = await fetch("./data.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`A data.json nem tölthető be (HTTP ${res.status}).`);
    const data = await res.json();

    // Layout
    const root = d3.hierarchy(data);
    const treeLayout = d3.tree().nodeSize([110, 170]); // vízszintes / függőleges távolság
    treeLayout(root);

    // Linkek
    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr(
        "d",
        d3.linkVertical()
          .x((d) => d.x)
          .y((d) => d.y)
      );

    // Node csoport
    const node = g
      .selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.x},${d.y})`);

    // Szöveg először (hogy mérni tudjuk a szélességet)
    node
      .append("text")
      .attr("x", 0)
      .attr("y", 0)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle") // ✅ valódi középre igazítás
      .text((d) => d.data.name ?? "");

    // Doboz a szöveg alá, automatikus szélességgel
    node
      .insert("rect", "text")
      .attr("y", -16)
      .attr("height", 32)
      .attr("rx", 8)
      .each(function () {
        const parent = this.parentNode;
        const textEl = d3.select(parent).select("text").node();

        // Ha valamiért nem mérhető, essünk vissza fix szélességre
        let textWidth = 0;
        try {
          textWidth = textEl ? textEl.getComputedTextLength() : 0;
        } catch {
          textWidth = 0;
        }

        const minW = 120;
        const pad = 26; // belső padding
        const boxW = Math.max(minW, textWidth + pad);

        d3.select(this)
          .attr("x", -boxW / 2)
          .attr("width", boxW);
      });

    // ✅ AUTO-FIT / AUTO-CENTER
    // A teljes tartalom befoglaló téglalapja
    const bounds = g.node().getBBox();
    const fullWidth = bounds.width;
    const fullHeight = bounds.height;

    const padding = 60; // biztonsági margó
    const scale = Math.min(
      (width - padding) / fullWidth,
      (height - padding) / fullHeight
    );

    // Ésszerű korlátok
    const clampedScale = Math.max(0.25, Math.min(2.0, scale));

    // Középre igazítás úgy, hogy a bounds.x/y-t is figyelembe vesszük
    const translateX = (width - fullWidth * clampedScale) / 2 - bounds.x * clampedScale;
    const translateY = (height - fullHeight * clampedScale) / 2 - bounds.y * clampedScale;

    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(translateX, translateY).scale(clampedScale)
    );

    setStatus(""); // ok
  } catch (err) {
    console.error(err);
    setStatus(`Hiba: ${err?.message || String(err)}`);
  }
});
