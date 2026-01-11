window.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("tree-container");
  const status = document.getElementById("status");

  const setStatus = (msg) => { status.textContent = msg || ""; };

  try {
    if (!window.d3) throw new Error("A D3 nem töltődött be (internet / CDN hiba).");

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 600;

    const svg = d3.select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g").attr("transform", "translate(50,50)");

    svg.call(d3.zoom().on("zoom", (event) => g.attr("transform", event.transform)));

    const res = await fetch("./data.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`A data.json nem tölthető be (HTTP ${res.status}).`);

    const data = await res.json();

    const root = d3.hierarchy(data);
    const treeLayout = d3.tree().nodeSize([110, 160]);
    treeLayout(root);

    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d3.linkVertical().x(d => d.x).y(d => d.y));

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

    setStatus(""); // ok
  } catch (err) {
    console.error(err);
    setStatus(`Hiba: ${err.message || String(err)}`);
  }
});
