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

    ABRAHAMIC_MAIN: "#56B4E9",
    ISHMAEL: "#F0E442",
    ESAU: "#A52A2A",

    JUDAH: "#8B5CF6",
    DAVIDIC: "#111827",
    LEVITE: "#0F766E",

    DEFAULT: "#333333"
  };

  const BRANCH_LABELS = {
    ROOT: "Ádám / gyökér",
    CAIN: "Káin-ága",
    SETH: "Sét-ága",
    SHEM: "Sém-ága",
    HAM: "Hám-ága",
    JAPHETH: "Jáfet-ága",
    JUDAH: "Júda-törzs (később)",
    DAVIDIC: "Dávid-ház (később)",
    LEVITE: "Lévi / papi ág (később)"
  };

  function renderLegend() {
    const el = document.getElementById("legend");
    if (!el) return;

    const orderedKeys = [
      "ROOT","CAIN","SETH",
      "SHEM","HAM","JAPHETH",
      "JUDAH","DAVIDIC","LEVITE"
    ];

    const rows = orderedKeys.map(k => {
      const color = BRANCH_COLORS[k] || BRANCH_COLORS.DEFAULT;
      const label = BRANCH_LABELS[k] || k;
      return `
        <div class="row">
          <span class="swatch" style="border-color:${color}"></span>
          <span>${label}</span>
        </div>
      `;
    }).join("");

    el.innerHTML = `
      <h3>Jelmagyarázat</h3>
      <div class="group-title">Ágak (színek)</div>
      ${rows}

      <div class="group-title">Jelölések</div>
      <div class="row">
        <span class="line" style="border-top-color:#111827"></span>
        <span>alap kapcsolat</span>
      </div>
      <div class="row">
        <span class="line dotted" style="border-top-color:#111827"></span>
        <span><b>anyai ág</b> (Lukács-végpontnál) + “M” jel</span>
      </div>
      <div class="row">
        <span class="swatch" style="border-color:#111827; border-width:3px;"></span>
        <span><b>kiemelt fővonal</b> (mainline)</span>
      </div>

      <div class="note">
        Tipp: kattints egy dobozra a részfa nyitásához/csukásához.
      </div>
    `;
  }

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

  // ---- Collapsible helpers
  function collapseAll(d) {
    if (d.children) {
      d._children = d.children;
      d._children.forEach(collapseAll);
      d.children = null;
    }
  }

  function expandOneLevel(d) {
    if (d._children) {
      d.children = d._children;
      d._children = null;
    }
  }

  function expandAll(d) {
    expandOneLevel(d);
    if (d.children) d.children.forEach(expandAll);
  }

  function findChildByName(parent, name) {
    const kids = parent.children || parent._children || [];
    return kids.find(k => k.data?.name === name);
  }

  // Sét ág lineáris láncán lefelé megyünk, amíg el nem érjük Noét
  function expandSethToNoah(sethNode) {
    let cur = sethNode;
    // biztosítsuk, hogy a lánc látható legyen
    while (cur) {
      expandOneLevel(cur);
      if (cur.data?.name === "Noé") return cur;
      const kids = cur.children || [];
      if (kids.length === 0) return null;
      // ez a vonal nálad egy-gyerekes lánc, így az első gyerek felé haladunk
      cur = kids[0];
    }
    return null;
  }

  try {
    if (!container) throw new Error("Nem találom a #tree-container elemet.");
    if (!window.d3) throw new Error("A D3 nem töltődött be (CDN hiba vagy nincs internet).");

    renderLegend();

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

    const res = await fetch("./data.json?v=9", { cache: "no-store" });
    if (!res.ok) throw new Error(`A data.json nem tölthető be (HTTP ${res.status}).`);
    const data = await res.json();

    let i = 0;

    const root = d3.hierarchy(data);
    root.x0 = 0;
    root.y0 = 0;

    // 1) Először mindent összecsukunk
    collapseAll(root);

    // 2) Alapból ezt kérted nyitva:
    // - Káin ág Jábál/Júbál/Tubál-Káin/Naáma-ig
    // - Sét vonal Sém/Hám/Jáfet-ig
    // - Ábel jelenjen meg (ő Ádám közvetlen gyereke, így root nyitásával látszik)
    expandOneLevel(root); // Ádám gyermekei látszanak

    // Káin ág: teljesen nyitjuk (ott nincs túl hosszú folytatás)
    const cain = findChildByName(root, "Káin");
    if (cain) expandAll(cain);

    // Sét ág: csak Noéig + Noé gyerekeiig
    const seth = findChildByName(root, "Sét");
    if (seth) {
      const noah = expandSethToNoah(seth);
      if (noah) {
        // Noé gyerekei látszódjanak
        expandOneLevel(noah);

        // de Sém/Hám/Jáfet alatt MOST maradjon csukva minden (áttekinthető első nézet)
        (noah.children || []).forEach(ch => collapseAll(ch));
      }
    }

    // Layout
    const treeLayout = d3.tree().nodeSize([110, 145]); // kompakt (A + C)
    const linkGen = d3.linkVertical().x(d => d.x).y(d => d.y);

    function applyNodeBoxSizing(nodeSel) {
      nodeSel.each(function(d) {
        const group = d3.select(this);
        const textEl = group.select("text.label").node();
        const rect = group.select("rect.box");

        let textWidth = 0;
        try { textWidth = textEl ? textEl.getComputedTextLength() : 0; } catch { textWidth = 0; }

        const minW = 120;
        const pad = 30;
        const boxW = Math.max(minW, textWidth + pad);

        const bk = resolveBranchKey(d);
        const stroke = BRANCH_COLORS[bk] || BRANCH_COLORS.DEFAULT;

        rect
          .attr("x", -boxW / 2)
          .attr("width", boxW)
          .attr("stroke", stroke)
          .attr("stroke-width", hasFlag(d, "mainline") ? 2.5 : 1.2)
          .attr("stroke-dasharray", hasFlag(d, "maternal") ? "3,4" : null);
      });
    }

    function update(source) {
      treeLayout(root);

      const nodes = root.descendants();
      const links = root.links();

      // Join nodes
      const node = g.selectAll("g.node")
        .data(nodes, d => d.id || (d.id = ++i));

      const nodeEnter = node.enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", `translate(${source.x0},${source.y0})`)
        .style("cursor", "pointer")
        .on("click", (event, d) => {
          // toggle
          if (d.children) {
            d._children = d.children;
            d.children = null;
          } else if (d._children) {
            d.children = d._children;
            d._children = null;
          }
          update(d);
        });

      // Rect
      nodeEnter.append("rect")
        .attr("class", "box")
        .attr("y", -16)
        .attr("height", 32)
        .attr("rx", 8)
        .attr("fill", "#ffffff");

      // Label + kis jel a csukható node-okhoz
      nodeEnter.append("text")
        .attr("class", "label")
        .attr("x", 0)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(d => {
          const hasKids = (d.children && d.children.length) || (d._children && d._children.length);
          const marker = hasKids ? (d.children ? " ▼" : " ▶") : "";
          return (d.data.name ?? "") + marker;
        });

      // Maternal badge
      const maternalEnter = nodeEnter.filter(d => hasFlag(d, "maternal"));
      maternalEnter.append("circle")
        .attr("cx", 62)
        .attr("cy", -16)
        .attr("r", 8)
        .attr("fill", "#ffffff")
        .attr("stroke", "#111827")
        .attr("stroke-width", 1);

      maternalEnter.append("text")
        .attr("x", 62)
        .attr("y", -16)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .attr("font-size", 10)
        .text("M");

      // Update + merge
      const nodeMerge = nodeEnter.merge(node);

      // Update label (marker frissítése)
      nodeMerge.select("text.label")
        .text(d => {
          const hasKids = (d.children && d.children.length) || (d._children && d._children.length);
          const marker = hasKids ? (d.children ? " ▼" : " ▶") : "";
          return (d.data.name ?? "") + marker;
        });

      // Apply box sizing + coloring
      applyNodeBoxSizing(nodeMerge);

      nodeMerge.transition()
        .duration(350)
        .attr("transform", d => `translate(${d.x},${d.y})`);

      node.exit().transition()
        .duration(250)
        .attr("transform", `translate(${source.x},${source.y})`)
        .remove();

      // Join links
      const link = g.selectAll("path.link")
        .data(links, d => d.target.id);

      const linkEnter = link.enter()
        .append("path")
        .attr("class", "link")
        .attr("fill", "none")
        .attr("d", () => {
          const o = { x: source.x0, y: source.y0 };
          return linkGen({ source: o, target: o });
        });

      const linkMerge = linkEnter.merge(link);

      linkMerge
        .attr("stroke", (l) => {
          const bk = resolveBranchKey(l.target);
          return BRANCH_COLORS[bk] || BRANCH_COLORS.DEFAULT;
        })
        .attr("stroke-width", (l) => hasFlag(l.target, "mainline") ? 2.5 : 1.5)
        .attr("stroke-dasharray", (l) => hasFlag(l.target, "maternal") ? "3,4" : null)
        .style("opacity", (l) => hasFlag(l.target, "uncertain") ? 0.65 : 1);

      linkMerge.transition()
        .duration(350)
        .attr("d", linkGen);

      link.exit().transition()
        .duration(250)
        .attr("d", () => {
          const o = { x: source.x, y: source.y };
          return linkGen({ source: o, target: o });
        })
        .remove();

      // Stash old positions
      nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });

      // Auto-fit csak az első render után (hogy ne ugráljon kattintáskor)
    }

    // 1. render
    update(root);

    // Auto-fit / center egyszer (induláskor)
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
