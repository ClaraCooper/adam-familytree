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
    
    const g = svg.append("g").attr("transform", "translate(50,80)");
    
    svg.call(d3.zoom().on("zoom", (event) => g.attr("transform", event.transform)));
    
    const res = await fetch("./data.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`A data.json nem tölthető be (HTTP ${res.status}).`);
    const data = await res.json();
    
    const root = d3.hierarchy(data);
    const treeLayout = d3.tree().nodeSize([140, 180]);
    treeLayout(root);
    
    // Vonalak
    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d3.linkVertical().x(d => d.x).y(d => d.y));
    
    // Csomópontok
    const node = g.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`);
    
    // Doboz
    node.append("rect")
      .attr("x", -65)
      .attr("y", -28)
      .attr("width", 130)
      .attr("height", 56)
      .attr("rx", 8);
    
    // Név (felső sor)
    node.append("text")
      .attr("dy", -8)
      .attr("class", "node-name")
      .text(d => d.data.name);
    
    // Dátumok (alsó sor)
    node.append("text")
      .attr("dy", 12)
      .attr("class", "node-dates")
      .text(d => {
        const born = d.data.born_am;
        const died = d.data.died_am;
        if (born && died) return `(${born}–${died})`;
        if (born) return `(sz. ${born})`;
        if (died) return `(† ${died})`;
        return "";
      });
    
    setStatus("");
  } catch (err) {
    console.error(err);
    setStatus(`Hiba: ${err.message || String(err)}`);
  }
});
