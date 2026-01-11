window.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("tree-container");
  const status = document.getElementById("status");

  const setStatus = (msg) => {
    if (status) status.textContent = msg || "";
  };

  // ====== SZÍNSÉMA (bővíthető Jézusig) ======
  const BRANCH_COLORS = {
    ROOT: "#4B5563",
    CAIN: "#D55E00",
    SETH: "#0072B2",

    // később (Noé után):
    SHEM: "#009E73",
    HAM: "#CC79A7",
    JAPHETH: "#E69F00",

    JUDAH: "#8B5CF6",
    DAVIDIC: "#111827",
    LEVITE: "#0F766E",

    // fallback
    DEFAULT: "#333333"
  };

  // Biztonságos branch feloldás (öröklődik a szülőtől, ha a node-on nincs megadva)
  const resolveBranchKey = (d) => {
    let cur = d;
    while (cur) {
      const k = cur.data?.branchKey;
      if (k) return k;
      cur = cur.parent;
    }
    return "DEFAULT";
  };

  const hasFlag = (d, flag) => {
    const flags = d?.data?.flags;
    return Array.isArray(flags) && flags.includes(flag);
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

    // Layout (A + C: kompaktabb függőleges tér)
    const root = d3.hierarchy(data);
    const treeLayout = d3.tree().nodeSize([110, 145]); // korábban 170 volt
    treeLayout(root);

    // ====== LINKEK ======
    const link = g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d3.linkVertical().x(d => d.x).y(d => d.y));

    // Link stílus: ág színe + maternal jelölés
    link
      .attr("stroke", (l) => {
        const bk = resolveBranchKey(l.target);
        return BRANCH_COLORS[bk] || BRANCH_COLORS.DEFAULT;
      })
      .attr("stroke-width", (l) => hasFlag(l.target, "mainline") ? 2.5 : 1.5)
      .attr("stroke-dasharray", (l) => hasFlag(l.target, "maternal") ? "3,4" : null)
      .attr("opacity", (l) => hasFlag(l.target, "uncertain") ? 0.65 : 1);

    // ====== NODE-OK ======
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
      .attr("text-anchor", "middle") // ✅ középen
      .text((d) => d.data.name ?? "");

    // Doboz a szöveg alá, automatikus szélességgel + ág színű kerettel
    node
      .insert("rect", "text")
      .attr("y", -16)
      .attr("height", 32)
      .attr("rx", 8)
      .attr("fill", "#e8f0ff") // marad világos, olvasható
      .attr("opacity", (d) => hasFlag(d, "uncertain") ? 0.75 : 1)
      .each(function (d) {
        const parent = this.parentNode;
        const textEl = d3.select(parent).select("text").node();

        let textWidth = 0;
        try {
          textWidth = textEl ? textEl.getComputedTextLength() : 0;
        } catch {
          textWidth = 0;
        }

        const minW = 120;
        const pad = 26;
        const boxW = Math.max(minW, textWidth + pad);

        const bk = resolveBranchKey(d);
        const stroke = BRANCH_COLORS[bk] || BRANCH_COLORS.DEFAULT;

        d3.select(this)
          .attr("x", -boxW / 2)
          .attr("width", boxW)
          .attr("stroke", stroke)
          .attr("stroke-width", hasFlag(d, "mainline") ? 2.5 : 1.2)
          .attr("stroke-dasharray", hasFlag(d, "maternal") ? "3,4" : null);
      });

    // ====== “Mária / anyai ág” badge ======
    // Kicsi kör + “M” a node jobb felső sarkán
    const maternalNodes = node.filter(d => hasFlag(d, "maternal"));
    maternalNodes.append("circle")
      .attr("cx", 62)
      .attr("cy", -16)
      .attr("r", 8)
      .attr("fill", "#ffffff")
      .attr("stroke", "#111827")
      .attr("stroke-width", 1);

    maternalNodes.append("text")
      .attr("x", 62)
      .attr("y", -16)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("font-size", 10)
      .text("M");

    // ====== AUTO-FIT / AUTO-CENTER ======
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
