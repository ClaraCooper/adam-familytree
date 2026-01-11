window.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("tree-container");
  const status = document.getElementById("status");

  const setStatus = (msg) => { if (status) status.textContent = msg || ""; };

  // ====== SZÍNSÉMA ======
  const BRANCH_COLORS = {
    ROOT: "#4B5563",
    CAIN: "#D55E00",
    SETH: "#0072B2",

    SHEM: "#009E73",
    HAM: "#CC79A7",
    JAPHETH: "#E69F00",

    JUDAH: "#8B5CF6",
    DAVIDIC: "#111827",
    LEVITE: "#0F766E",

    DEFAULT: "#333333"
  };

  const resolveBranchKey = (d) => {
    let cur = d;
    while (cur) {
      const k = cur.data?.branchKey;
      if (k) return k;
      cur = cur.parent;
    }
    return "DEFAULT";
  };

  const hasFlag = (d, flag) => Array.isArray(d?.data?.flags) && d.data.flags.includes(flag);

  try {
    if (!container) throw new Error("Nem találom a #tree-container elemet.");
    if (!window.d3) throw new Error("A D3 nem töltődött be (CDN hiba vagy nincs internet).");

    // 👇 Ez direkt jelzi, hogy EZ a JS fut (ha F12 Console-t megnézed)
    console.log("✅ Colored app.js running (v=7)");

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

    // 👇 Verziózott JSON, hogy az se cache-lődjön
    const res = await fetch("./data.json?v=7", { cache: "no-store" });
    if (!res.ok) throw new Error(`A data.json nem tölthető be (HTTP ${res.status}).`);
    const data = await res.json();

    const root = d3.hierarchy(data);
    const treeLayout = d3.tree().nodeSize([110, 145]); // A + C (kompaktabb)
    treeLayout(root);

    // ====== LINKEK ======
    const links = g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d3.linkVertical().x(d => d.x).y(d => d.y))
      // Attribútum + style (hogy semmilyen CSS ne írja felül)
      .attr("fill", "none")
      .attr("stroke", (l) => {
        const bk = resolveBranchKey(l.target);
        return BRANCH_COLORS[bk] || BRANCH_COLORS.DEFAULT;
      })
      .attr("stroke-width", (l) => hasFlag(l.target, "mainline") ? 2.5 : 1.5)
      .attr("stroke-dasharray", (l) => hasFlag(l.target, "maternal") ? "3,4" : null)
      .style("stroke", (l) => {
        const bk = resolveBranchKey(l.target);
        return BRANCH_COLORS[bk] || BRANCH_COLORS.DEFAULT;
      })
      .style("stroke-width", (l) => (hasFlag(l.target, "mainline") ? 2.5 : 1.5) + "px")
      .style("opacity", (l) => hasFlag(l.target, "uncertain") ? 0.65 : 1);

    // ====== NODE-OK ======
    const node = g.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`);

    // Text (középen)
    node.append("text")
      .attr("x", 0)
      .attr("y", 0)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(d => d.data.name ?? "");

    // Rect (auto szélesség + színezett keret)
    node.insert("rect", "text")
      .attr("y", -16)
      .attr("height", 32)
      .attr("rx", 8)
      .attr("fill", "#ffffff")
      .each(function (d) {
        const parent = this.parentNode;
        const textEl = d3.select(parent).select("text").node();

        let textWidth = 0;
        try { textWidth = textEl ? textEl.getComputedTextLength() : 0; } catch { textWidth = 0; }

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
          .attr("stroke-dasharray", hasFlag(d, "maternal") ? "3,4" : null)
          .style("stroke", stroke)
          .style("stroke-width", (hasFlag(d, "mainline") ? 2.5 : 1.2) + "px");
      });

    // Maternal badge (most még nincs használva, de készen áll)
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

    // Auto-fit / center
    const bounds = g.node().getBBox();
    const padding = 50;

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
