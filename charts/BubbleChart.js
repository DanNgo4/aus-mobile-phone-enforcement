const margin3 = { top: 50, right: 120, bottom: 100, left: 80 };
const width3 = 800 - margin3.left - margin3.right;
const height3 = 600 - margin3.top - margin3.bottom;

const container3 = d3.select("#chart3");
container3.select("svg").remove();

const tooltip3 = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

const svg3 = container3.append("svg")
  .attr("width", width3 + margin3.left + margin3.right)
  .attr("height", height3 + margin3.top + margin3.bottom)
  .append("g")
  .attr("transform", `translate(${margin3.left},${margin3.top})`);

container3.insert("h2", ":first-child")
  .style("text-align", "center")
  .style("margin-bottom", "20px")
  .text("Road Deaths vs Total Fines by Jurisdiction");

const xScale = d3.scaleLinear().range([0, width3]);
const yScale = d3.scaleLinear().range([height3, 0]);
const radiusScale = d3.scaleSqrt().range([5, 40]);

const colorScale = d3.scaleOrdinal()
  .domain(["NSW",     "QLD",     "VIC",     "TAS",     "SA",      "WA",      "NT",      "ACT"])
  .range([ "#FF69B4", "#FF7F0E", "#2CA02C", "#D62728", "#9467BD", "#8C564B", "#1F77B4", "#7F7F7F"]);

Promise.all([
  d3.csv("data/license_and_road_death.csv", d3.autoType),
  d3.csv("data/cleaned_dataset_1.csv", d3.autoType)
]).then(([roadData, finesData]) => {
  const finesByJurisdiction = d3.rollup(
    finesData,
    v => d3.sum(v, d => d.FINES),
    d => d.JURISDICTION
  );

  const bubbleData = roadData.map(d => {
    const totalFines = finesByJurisdiction.get(d.JURISDICTION);
    const finesPer10k = Math.floor((totalFines / d.LICENSES) * 10000);
    
    return {
      jurisdiction: d.JURISDICTION,
      roadDeaths: d.ROAD_DEATHS,
      totalFines: totalFines,
      licenses: d.LICENSES,
      finesPer10k: finesPer10k
    };
  });

  xScale.domain([0, d3.max(bubbleData, d => d.roadDeaths) * 1.1]);
  yScale.domain([0, d3.max(bubbleData, d => d.totalFines) * 1.1]);
  radiusScale.domain([0, d3.max(bubbleData, d => d.finesPer10k)]);

  svg3.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height3})`)
    .call(d3.axisBottom(xScale));

  svg3.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale).tickFormat(d3.format(",")));

  svg3.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -60)
    .attr("x", -height3 / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Total Number of Fines");

  svg3.append("text")
    .attr("x", width3 / 2)
    .attr("y", height3 + 50)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Number of Road Deaths");

  svg3.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${height3})`)
    .call(d3.axisBottom(xScale)
      .tickSize(-height3)
      .tickFormat("")
    )
    .style("stroke-dasharray", "3,3")
    .style("opacity", 0.3);

  svg3.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(yScale)
      .tickSize(-width3)
      .tickFormat("")
    )
    .style("stroke-dasharray", "3,3")
    .style("opacity", 0.3);

  const bubbles = svg3.selectAll(".bubble")
    .data(bubbleData)
    .enter().append("circle")
    .attr("class", "bubble")
    .attr("cx", d => xScale(d.roadDeaths))
    .attr("cy", d => yScale(d.totalFines))
    .attr("r", d => radiusScale(d.finesPer10k))
    .style("fill", d => colorScale(d.jurisdiction))
    .style("opacity", 0.7)
    .style("stroke", "#333")
    .style("stroke-width", 1);

  svg3.selectAll(".bubble-label")
    .data(bubbleData)
    .enter().append("text")
    .attr("class", "bubble-label")
    .attr("x", d => xScale(d.roadDeaths))
    .attr("y", d => yScale(d.totalFines) + 5)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .style("fill", "white")
    .style("user-select", "none")
    .style("-webkit-user-select", "none")
    .style("-moz-user-select", "none")
    .style("-ms-user-select", "none")
    .style("pointer-events", "none")
    .text(d => d.jurisdiction);

  bubbles
    .on("mousemove", function(event, d) {
      tooltip3
        .style("opacity", 1)
        .html(`
          <strong>${d.jurisdiction}</strong><br/>
          Road Deaths: ${d.roadDeaths}<br/>
          Total Fines: ${d.totalFines.toLocaleString()}<br/>
          Licenses: ${d.licenses.toLocaleString()}<br/>
          Fines per 10,000 drivers: ${d.finesPer10k}
        `)
        .style("left", (event.pageX - 225) + "px")
        .style("top", (event.pageY - 28) + "px");
      
      d3.select(this)
        .style("opacity", 1)
        .style("stroke-width", 2);
    })
    .on("mouseleave", function() {
      tooltip3.style("opacity", 0);
      
      d3.select(this)
        .style("opacity", 0.7)
        .style("stroke-width", 1);
    });

  const legend = svg3.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width3 + 20}, 20)`);

  const legendItems = legend.selectAll(".legend-item")
    .data(bubbleData)
    .enter().append("g")
    .attr("class", "legend-item")
    .attr("transform", (_, i) => `translate(0, ${i * 25})`);

  legendItems.append("circle")
    .attr("cx", 8)
    .attr("cy", 8)
    .attr("r", 8)
    .style("fill", d => colorScale(d.jurisdiction))
    .style("opacity", 0.7);

  legendItems.append("text")
    .attr("x", 20)
    .attr("y", 8)
    .attr("dy", "0.35em")
    .style("font-size", "12px")
    .style("text-decoration", "underline")
    .text(d => d.jurisdiction);

  legendItems
    .style("cursor", "pointer")
    .on("mouseover", function() {
      d3.select(this)
        .append("rect")
        .attr("class", "legend-hover-bg")
        .attr("x", -5)
        .attr("y", -5)
        .attr("width", 70)
        .attr("height", 18)
        .style("fill", "#f0f0f0")
        .style("opacity", 0.8)
        .lower();
    })
    .on("mouseout", function() {
      d3.select(this).select(".legend-hover-bg").remove();
    })
    .on("click", function(_, d) {
      const bubble = bubbles.filter(
        bubbleData => bubbleData.jurisdiction === d.jurisdiction
      );
      
      if (!bubble.empty()) {
        const bubbleNode = bubble.node();
        const bubbleData = bubble.datum();
        
        const cx = parseFloat(bubbleNode.getAttribute("cx"));
        const cy = parseFloat(bubbleNode.getAttribute("cy"));
        
        const rect = svg3.node().getBoundingClientRect();
        const pageX = rect.left + cx + margin3.left;
        const pageY = rect.top + cy + margin3.top;
        
        tooltip3.style("opacity", 1);
        
        tooltip3.html(`
          <strong>${bubbleData.jurisdiction}</strong><br/>
          Road Deaths: ${bubbleData.roadDeaths}<br/>
          Total Fines: ${bubbleData.totalFines.toLocaleString()}<br/>
          Licenses: ${bubbleData.licenses.toLocaleString()}<br/>
          Fines per 10,000 drivers: ${bubbleData.finesPer10k}
        `)
          .style("left", (pageX - 250) + "px")
          .style("top", (pageY - 28) + "px");
        
        bubbles.style("opacity", 0.3);
        bubble.style("opacity", 1)
              .style("stroke-width", 3);
      }
    });
}).catch(error => {
  console.error("Error loading data:", error);
}); 
