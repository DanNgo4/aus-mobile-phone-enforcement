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
  .domain([
    "NSW",
    "QLD",
    "VIC",
    "TAS",
    "SA",
    "WA",
    "NT",
    "ACT"
  ])
  .range([
    "rgba(34, 0, 255, 0.8)",
    "rgb(0, 98, 255)",
    "rgba(33, 51, 209, 0.8)",
    "rgba(0, 255, 255, 0.7)",
    "rgb(83, 189, 201)",
    "rgba(0, 120, 255, 0.9)",
    "rgb(7, 57, 137)", 
    "rgba(0, 157, 255, 0.9)"
  ]);

let originalRoadData, originalFinesData;
let isInitialBubbleRender = true;

Promise.all([
  d3.csv("../../data/license_and_road_death.csv", d3.autoType),
  d3.csv("../../data/cleaned_dataset_1.csv", d3.autoType)
]).then(([roadDataLoaded, finesDataLoaded]) => {
  originalRoadData = roadDataLoaded;
  originalFinesData = finesDataLoaded;
  
  const ageGroups = Array.from(new Set(originalFinesData.map(d => d.AGE_GROUP))).sort();
  const methods = Array.from(new Set(originalFinesData.map(d => d.DETECTION_METHOD))).sort();

  buildBubbleFilterDropdown("bubbleAgeGroupFilter", ageGroups, updateBubbleChart);
  buildBubbleFilterDropdown("bubbleDetectionMethodFilter", methods, updateBubbleChart);

  if (svg3.select(".x-axis").empty()) {
    svg3.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height3})`);
  }
  if (svg3.select(".y-axis").empty()) {
    svg3.append("g")
      .attr("class", "y-axis");
  }
  if (svg3.select(".x-label").empty()) {
    svg3.append("text")
      .attr("class", "x-label")
      .attr("x", width3 / 2)
      .attr("y", height3 + 50)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Number of Road Deaths");
  }
  if (svg3.select(".y-label").empty()) {
    svg3.append("text")
      .attr("class", "y-label")
      .attr("transform", "rotate(-90)")
      .attr("y", -60)
      .attr("x", -height3 / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Total Number of Fines");
  }
  
  setupBubbleChartEventListeners();
  updateBubbleChart();
  isInitialBubbleRender = false;

}).catch(error => {
  console.error("Error loading data for Bubble Chart:", error);
});

function buildBubbleFilterDropdown(id, values, changeCallback) {
  const dropdownContainer = d3.select(`#${id}`);
  dropdownContainer.selectAll("*").remove();
  values.forEach(v => {
    const label = dropdownContainer.append("label");
    label.append("input")
      .attr("type", "checkbox")
      .attr("value", v)
      .property("checked", true)
      .on("change", changeCallback);
    label.append("span").text(v);
  });
}

function setupBubbleChartEventListeners() {
  const resetButton = document.querySelector("#chart3 .filters-container .reset-filters-btn");
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      document.querySelectorAll("#chart3 input[type='checkbox']").forEach(checkbox => {
        checkbox.checked = true;
      });
      updateBubbleChart();
    });
  }

  // Handle filter button clicks
  document.querySelectorAll("#chart3 .filter-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const dropdown = e.target.closest(".filter-dropdown");
      e.stopPropagation();
      dropdown.classList.toggle("active");
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#chart3 .filter-dropdown")) {
      document.querySelectorAll("#chart3 .filter-dropdown.active").forEach(d => {
        d.classList.remove("active");
      });
    }
  });

  // Handle checkbox changes
  document.querySelectorAll("#chart3 input[type='checkbox']").forEach(checkbox => {
    checkbox.addEventListener("change", () => {
      updateBubbleChart();
    });
  });

  // Handle bubble interactions
  d3.select("body").on("click.bubble-chart-interactions", function(event) {
    if (!event.target.closest("#chart3 .legend-item") && !event.target.closest("#chart3 .bubble")) {
      svg3.selectAll(".bubble")
        .style("opacity", 0.7)
        .style("stroke-width", 1);
      tooltip3.style("opacity", 0);
    }
  });
}

function updateBubbleChart() {
  if (!originalRoadData || !originalFinesData) return;

  const selectedAges = Array.from(document.querySelectorAll("#bubbleAgeGroupFilter input:checked")).map(n => n.value);
  const selectedMethods = Array.from(document.querySelectorAll("#bubbleDetectionMethodFilter input:checked")).map(n => n.value);

  const filteredFinesData = originalFinesData.filter(d =>
    selectedAges.includes(d.AGE_GROUP) &&
    selectedMethods.includes(d.DETECTION_METHOD)
  );

  const finesByJurisdiction = d3.rollup(
    filteredFinesData,
    v => d3.sum(v, d => d.FINES),
    d => d.JURISDICTION
  );

  const bubbleData = originalRoadData.map(d => {
    const totalFines = finesByJurisdiction.get(d.JURISDICTION) || 0;
    const finesPer10k = Math.floor((totalFines / d.LICENSES) * 10000);
    return {
      jurisdiction: d.JURISDICTION,
      roadDeaths: d.ROAD_DEATHS,
      totalFines: totalFines,
      licenses: d.LICENSES,
      finesPer10k: finesPer10k
    };
  });

  xScale.domain([0, d3.max(bubbleData, d => d.roadDeaths) * 1.1 || 10]);
  const maxFines = d3.max(bubbleData, d => d.totalFines);
  yScale.domain([0, Math.max(1, maxFines * 1.1 || 10)]);
  radiusScale.domain([0, d3.max(bubbleData, d => d.finesPer10k) || 1]);

  if (isInitialBubbleRender) {
    svg3.select(".x-axis")
      .call(d3.axisBottom(xScale));
    svg3.select(".y-axis")
      .call(d3.axisLeft(yScale).tickFormat(d3.format(",")));
  } else {
    svg3.select(".x-axis")
      .transition()
      .duration(500)
      .call(d3.axisBottom(xScale));
    svg3.select(".y-axis")
      .transition()
      .duration(500)
      .call(d3.axisLeft(yScale).tickFormat(d3.format(",")));
  }

  const bubbles = svg3.selectAll(".bubble")
    .data(bubbleData, d => d.jurisdiction);

  bubbles.exit().remove();

  const bubblesEnter = bubbles.enter()
    .append("circle")
    .attr("class", "bubble")
    .style("fill", d => colorScale(d.jurisdiction))
    .style("opacity", 0.7)
    .style("stroke", "#333")
    .style("stroke-width", 1);

  const bubblesEnterMerge = bubbles.merge(bubblesEnter)
    .style("fill", d => colorScale(d.jurisdiction))
    .style("opacity", 0.7)
    .style("stroke", "#333")
    .style("stroke-width", 1)
    .on("mousemove", function(event, d) {
      tooltip3.style("opacity", 1)
        .html(
          `<strong>${d.jurisdiction}</strong><br/>
          Road Deaths: ${d.roadDeaths}<br/>
          Total Fines: ${d.totalFines.toLocaleString()}<br/>
          Licenses: ${d.licenses.toLocaleString()}<br/>
          Fines per 10,000 drivers: ${d.finesPer10k}`
        )
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px");
      d3.select(this).style("opacity", 1).style("stroke-width", 2);
    })
    .on("mouseleave", function() {
      tooltip3.style("opacity", 0);
      d3.select(this).style("opacity", 0.7).style("stroke-width", 1);
    });

  if (isInitialBubbleRender) {
    bubblesEnterMerge
      .attr("cx", d => {
        d.cx = xScale(d.roadDeaths);
        return d.cx;
      })
      .attr("cy", d => {
        d.cy = yScale(d.totalFines);
        return d.cy;
      })
      .attr("r", d => {
        d.r = Math.max(3, radiusScale(d.finesPer10k) || 3);
        return d.r;
      });
  } else {
    bubblesEnterMerge
      .transition().duration(500)
      .attr("cx", d => {
        d.cx = xScale(d.roadDeaths);
        return d.cx;
      })
      .attr("cy", d => {
        d.cy = yScale(d.totalFines);
        return d.cy;
      })
      .attr("r", d => {
        d.r = Math.max(3, radiusScale(d.finesPer10k) || 3);
        return d.r;
      });
  }

  const labels = svg3.selectAll(".bubble-label").data(bubbleData, d => d.jurisdiction);

  labels.exit().remove();

  const labelsEnter = labels.enter().append("text").attr("class", "bubble-label");
  
  const labelsEnterMerge = labels.merge(labelsEnter)
    .attr("text-anchor", "middle")
    .style("font-size", "10px")
    .style("font-weight", "bold")
    .style("fill", "#fff")
    .style("pointer-events", "none");

  if (isInitialBubbleRender) {
    labelsEnterMerge
      .attr("x", d => d.cx)
      .attr("y", d => d.cy + 4)
      .text(d => d.jurisdiction);
  } else {
    labelsEnterMerge
      .transition().duration(500)
      .attr("x", d => d.cx)
      .attr("y", d => d.cy + 4)
      .text(d => d.jurisdiction);
  }

  svg3.selectAll(".legend").remove();
  const allJurisdictions = originalRoadData.map(d => d.JURISDICTION).sort((a, b) => a.localeCompare(b));
  const legend = svg3.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width3 + 20}, 20)`);
  const legendItems = legend.selectAll(".legend-item")
    .data(allJurisdictions, d => d)
    .enter().append("g")
    .attr("class", "legend-item")
    .attr("transform", (_, i) => `translate(0, ${i * 25})`);
  legendItems.append("circle")
    .attr("cx", 8)
    .attr("cy", 8)
    .attr("r", 8)
    .style("fill", d => colorScale(d))
    .style("opacity", 0.7);
  legendItems.append("text")
    .attr("x", 20)
    .attr("y", 8)
    .attr("dy", "0.35em")
    .style("font-size", "12px")
    .style("text-decoration", "underline")
    .text(d => d);
  legendItems
    .style("cursor", "pointer")
    .on("mouseover", function() {
      d3.select(this)
        .append("rect")
        .attr("class", "legend-hover-bg")
        .attr("x", -5)
        .attr("y", -5)
        .attr("width", 100)
        .attr("height", 20)
        .style("fill", "#f0f0f0")
        .style("opacity", 0.5)
        .lower();
    })
    .on("mouseout", function() {
      d3.select(this).select(".legend-hover-bg").remove();
    })
    .on("click", function(_, jurisdiction) {
      const clickedLegendItem = d3.select(this);
      const isCurrentlyActive = clickedLegendItem.classed("active-legend");

      svg3.selectAll(".bubble")
        .style("opacity", 0.7)
        .style("stroke-width", 1)
        .style("stroke", "#333");
      svg3.selectAll(".bubble-label")
        .style("opacity", 1);
      
      legend.selectAll(".legend-item")
        .classed("active-legend", false)
        .select("circle").style("opacity", 0.7);
      tooltip3.style("opacity", 0);

      if (!isCurrentlyActive) {
        clickedLegendItem.classed("active-legend", true);
        clickedLegendItem.select("circle").style("opacity", 1);

        const bubble = svg3.selectAll(".bubble").filter(b => b.jurisdiction === jurisdiction);
        const bubbleLabel = svg3.selectAll(".bubble-label").filter(l => l.jurisdiction === jurisdiction);

        if (!bubble.empty()) {
          svg3.selectAll(".bubble").filter(b => b.jurisdiction !== jurisdiction)
            .style("opacity", 0.3)
            .style("stroke-width", 1)
            .style("stroke", "#333");

          bubble.raise()
            .style("opacity", 1)
            .style("stroke-width", 3)
            .style("stroke", "black");
          
          if (!bubbleLabel.empty()){
            bubbleLabel.raise().style("opacity", 1);
          }

          const bubbleData = bubble.datum();
          
          const svgRect = svg3.node().getBoundingClientRect();
          
          const gTransform = d3.select(svg3.node().parentNode).attr("transform");
          let gOffsetX = 0;
          let gOffsetY = 0;
          if (gTransform) {
              const parts = /translate\(([^,]+),([^)]+)\)/.exec(gTransform);
              if (parts && parts.length === 3) {
                  gOffsetX = parseFloat(parts[1]);
                  gOffsetY = parseFloat(parts[2]);
              }
          }

          const bubbleCenterX = bubbleData.cx || xScale(bubbleData.roadDeaths);
          const bubbleCenterY = bubbleData.cy || yScale(bubbleData.totalFines);
          const bubbleRadius = bubbleData.r || (radiusScale(bubbleData.finesPer10k) || 0);

          let tooltipX = svgRect.left + gOffsetX + bubbleCenterX - 100;
          let tooltipY = svgRect.top + gOffsetY + bubbleCenterY - bubbleRadius - 10;

          tooltip3.style("opacity", 1)
            .html(
              `<strong>${bubbleData.jurisdiction}</strong><br/>
              Road Deaths: ${bubbleData.roadDeaths}<br/>
              Total Fines: ${bubbleData.totalFines.toLocaleString()}<br/>
              Licenses: ${bubbleData.licenses.toLocaleString()}<br/>
              Fines per 10,000 drivers: ${bubbleData.finesPer10k}`
            )
            .style("left", tooltipX + "px")
            .style("top", tooltipY + "px")
            .style("transform", "translateX(-50%)"); 

        } else {
          console.warn("No bubble data for legend item:", jurisdiction);
        }
      } 
    });

  legendItems.append("circle")
    .attr("cx", 8).attr("cy", 8).attr("r", 8)
    .style("fill", d => colorScale(d));

  legendItems.append("text")
    .attr("x", 20).attr("y", 8).attr("dy", "0.35em")
    .style("font-size", "12px").text(d => d);

  renderSizeLegend();
}

function renderSizeLegend() {
  const legendDiv = d3.select("#bubble-size-legend");
  legendDiv.html("");

  const legendSvg = legendDiv.append("svg")
    .attr("width", 300)
    .attr("height", 100);

  legendSvg.append("text")
    .attr("x", 150)
    .attr("y", 10)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .text("Fines per 10,000 licenses");

  const sizeValues = [100, 200, 300];
  const circleSpacing = 80;
  const startX = (300 - (sizeValues.length - 1) * circleSpacing) / 2;
  
  sizeValues.forEach((d, i) => {
    const cx = startX + i * circleSpacing;
    
    legendSvg.append("circle")
      .attr("cx", cx)
      .attr("cy", 50)
      .attr("r", radiusScale(d))
      .style("fill", "#ccc")
      .style("opacity", 0.7)
      .style("stroke", "#333");

    legendSvg.append("text")
      .attr("x", cx)
      .attr("y", 65)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text(d.toLocaleString());
  });
} 
