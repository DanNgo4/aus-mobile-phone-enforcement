const container = d3.select("#chart1");

const tooltip1 = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

function getResponsiveDimensions() {
  const screenWidth = window.innerWidth;
  
  if (screenWidth <= 768) {   // Mobile
    return {
      fullWidth: Math.min(screenWidth - 40, 600),
      width: Math.min(screenWidth - 40, 600) - margin.left - margin.right,
      height: 400 - margin.top - margin.bottom,
      isStacked: true
    };
  } else if (screenWidth <= 1024) { // Tablet
    return {
      fullWidth: Math.min(screenWidth - 60, 800),
      width: Math.min(screenWidth - 60, 800) - margin.left - margin.right,
      height: 500 - margin.top - margin.bottom,
      isStacked: true
    };
  } else { // Desktop
    return {
      fullWidth: fullWidth,
      width: (fullWidth / 2) - margin.left - margin.right,
      height: 600 - margin.top - margin.bottom,
      isStacked: false
    };
  }
}

let responsiveDims = getResponsiveDimensions();

const chartsContainer = container.append("div")
  .style("display", "flex")
  .style("justify-content", responsiveDims.isStacked ? "center" : "space-between")
  .style("flex-direction", responsiveDims.isStacked ? "column" : "row")
  .style("align-items", responsiveDims.isStacked ? "center" : "stretch")
  .style("width", responsiveDims.fullWidth + "px")
  .style("margin", "0 auto");

const svg1Large = chartsContainer.append("div")
  .style("margin-bottom", responsiveDims.isStacked ? "2rem" : "0")
  .append("svg")
    .attr("width", responsiveDims.width + margin.left + margin.right)
    .attr("height", responsiveDims.height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const svg1Small = chartsContainer.append("div")
  .style("margin-bottom", responsiveDims.isStacked ? "2rem" : "0")
  .append("svg")
    .attr("width", responsiveDims.width + margin.left + margin.right)
    .attr("height", responsiveDims.height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const x1 = d3.scaleBand().padding(0.2);
const x2 = d3.scaleBand().padding(0.2);

const y1 = d3.scaleLinear().range([responsiveDims.height, 0]);
const y2 = d3.scaleLinear().range([responsiveDims.height, 0]);

const color = d3.scaleOrdinal()
  .domain(["Camera issued",     "Police issued"])
  .range(["rgb(7, 57, 137)", "rgba(28, 187, 255, 0.6)"]);

const xAxisG1 = svg1Large.append("g")
  .attr("class", "x-axis")
  .attr("transform", `translate(0,${responsiveDims.height})`);
const yAxisG1 = svg1Large.append("g")
  .attr("class", "y-axis");

const xAxisG2 = svg1Small.append("g")
  .attr("class", "x-axis")
  .attr("transform", `translate(0,${responsiveDims.height})`);
const yAxisG2 = svg1Small.append("g")
  .attr("class", "y-axis");

container.insert("h2", ":first-child")
  .style("text-align", "center")
  .style("margin-bottom", "20px")
  .text("Fines by Jurisdiction and Detection Method");

svg1Large.append("text")
  .attr("transform", "rotate(-90)")
  .attr("y", -60)
  .attr("x", -responsiveDims.height / 2)
  .attr("text-anchor", "middle")
  .text("Number of Fines");

svg1Small.append("text")
  .attr("transform", "rotate(-90)")
  .attr("y", -60)
  .attr("x", -responsiveDims.height / 2)
  .attr("text-anchor", "middle")
  .text("Number of Fines");

svg1Large.append("text")
  .attr("x", responsiveDims.width / 2)
  .attr("y", responsiveDims.height + 60)
  .attr("text-anchor", "middle")
  .text("Jurisdiction");

svg1Small.append("text")
  .attr("x", responsiveDims.width / 2)
  .attr("y", responsiveDims.height + 60)
  .attr("text-anchor", "middle")
  .text("Jurisdiction");

let originalData;
let isInitialRender = true;

d3.csv("../../data/cleaned_dataset_1.csv", d3.autoType).then(data => {
  originalData = data;
  const jurisdictions = Array.from(new Set(data.map(d => d.JURISDICTION))).sort();
  const ageGroups = Array.from(new Set(data.map(d => d.AGE_GROUP))).sort();
  const methods = Array.from(new Set(data.map(d => d.DETECTION_METHOD))).sort();
  
  buildFilterDropdown("ageGroupFilter", ageGroups, update);
  buildFilterDropdown("detectionMethodFilter", methods, update);
  buildFilterDropdown("jurisdictionFilter", jurisdictions, update); 

  setupEventListeners();
  update();
  isInitialRender = false;

}).catch(err => console.error("Error loading CSV for Stacked Bar Chart:", err));

// Add window resize listener for responsiveness
window.addEventListener("resize", debounce(() => {
  const newDims = getResponsiveDimensions();
  
  // Only update if dimensions actually changed
  if (newDims.width !== responsiveDims.width || 
      newDims.height !== responsiveDims.height || 
      newDims.isStacked !== responsiveDims.isStacked) {
    
    responsiveDims = newDims;
    updateChartLayout();
    if (originalData) update();
  }
}, 250));

function debounce(func, wait) {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);

    timeout = setTimeout(later, wait);
  };
}

function updateChartLayout() {
  chartsContainer
    .style("justify-content", responsiveDims.isStacked ? "center" : "space-between")
    .style("flex-direction", responsiveDims.isStacked ? "column" : "row")
    .style("align-items", responsiveDims.isStacked ? "center" : "stretch")
    .style("width", responsiveDims.fullWidth + "px");
  
  chartsContainer.selectAll("div")
    .style("margin-bottom", responsiveDims.isStacked ? "2rem" : "0");
    
  chartsContainer.selectAll("svg")
    .attr("width", responsiveDims.width + margin.left + margin.right)
    .attr("height", responsiveDims.height + margin.top + margin.bottom);
  
  y1.range([responsiveDims.height, 0]);
  y2.range([responsiveDims.height, 0]);
  x1.range([0, responsiveDims.width]);
  x2.range([0, responsiveDims.width]);
  
  xAxisG1.attr("transform", `translate(0,${responsiveDims.height})`);
  xAxisG2.attr("transform", `translate(0,${responsiveDims.height})`);
  
  svg1Large.selectAll("text")
    .filter(function() { return d3.select(this).text() === "Number of Fines"; })
    .attr("x", -responsiveDims.height / 2);
    
  svg1Small.selectAll("text")
    .filter(function() { return d3.select(this).text() === "Number of Fines"; })
    .attr("x", -responsiveDims.height / 2);
    
  svg1Large.selectAll("text")
    .filter(function() { return d3.select(this).text() === "Jurisdiction"; })
    .attr("x", responsiveDims.width / 2)
    .attr("y", responsiveDims.height + 60);
    
  svg1Small.selectAll("text")
    .filter(function() { return d3.select(this).text() === "Jurisdiction"; })
    .attr("x", responsiveDims.width / 2)
    .attr("y", responsiveDims.height + 60);
}

function buildFilterDropdown(id, values, changeCallback) {
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

function setupEventListeners() {
  const resetButton = document.querySelector("#chart1 .filters-container .reset-filters-btn");
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      document.querySelectorAll("#chart1 input[type='checkbox']").forEach(checkbox => {
        checkbox.checked = true;
      });
      update();
    });
  }

  // Handle filter button clicks
  document.querySelectorAll("#chart1 .filter-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const dropdown = e.target.closest(".filter-dropdown");
      e.stopPropagation();
      dropdown.classList.toggle("active");
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#chart1 .filter-dropdown")) {
      document.querySelectorAll("#chart1 .filter-dropdown.active").forEach(d => {
        d.classList.remove("active");
      });
    }
  });

  // Handle checkbox changes
  document.querySelectorAll("#chart1 input[type='checkbox']").forEach(checkbox => {
    checkbox.addEventListener("change", () => {
      update();
    });
  });
}

function update() {    
  if (!originalData) return;

  const selectedAges = Array.from(document.querySelectorAll("#ageGroupFilter input:checked"))
                            .map(n => n.value);
  const selectedMethods = Array.from(document.querySelectorAll("#detectionMethodFilter input:checked"))
                               .map(n => n.value);
  const selectedStates = Array.from(document.querySelectorAll("#jurisdictionFilter input:checked"))
                              .map(n => n.value);

  const filtered = originalData.filter(d =>
    selectedAges.includes(d.AGE_GROUP) &&
    selectedMethods.includes(d.DETECTION_METHOD) &&
    selectedStates.includes(d.JURISDICTION)
  );
  
  const sumMap = d3.rollup(
    filtered,

    v => {
      const totals = { total: 0 };

      selectedMethods.forEach(m => { 
        const count = d3.sum(v.filter(d => d.DETECTION_METHOD === m), d => d.FINES);

        totals[m] = isNaN(count) ? 0 : count;

        totals.total += totals[m]; 
      });
      
      return totals;
    },

    d => d.JURISDICTION
  );

  let sumData = Array.from(sumMap, ([jur, vals]) => ({ JURISDICTION: jur, ...vals }));
  
  sumData.forEach(d => {
    selectedMethods.forEach(m => {
      if (!(m in d)) d[m] = 0;
    });
  });
  
  const largeJurs = ["NSW", "QLD", "VIC"];
  const largeData = sumData.filter(d => largeJurs.includes(d.JURISDICTION));
  const smallData = sumData.filter(d => !largeJurs.includes(d.JURISDICTION));

  x1.domain(largeData.map(d => d.JURISDICTION))
    .range([0, responsiveDims.width]);
  x2.domain(smallData.map(d => d.JURISDICTION))
    .range([0, responsiveDims.width]);

  y1.domain([0, d3.max(largeData, d => d.total) * 1.1 || 10]);
  y2.domain([0, d3.max(smallData, d => d.total) * 1.1 || 10]);

  xAxisG1.call(d3.axisBottom(x1))
    .selectAll("text")      
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  xAxisG2.call(d3.axisBottom(x2))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");
  
  if (isInitialRender) {
    yAxisG1.call(d3.axisLeft(y1).tickFormat(d3.format(",")));
    yAxisG2.call(d3.axisLeft(y2).tickFormat(d3.format(",")));
  } else {
    yAxisG1.transition().duration(500)
      .call(d3.axisLeft(y1).tickFormat(d3.format(",")));    
    
    yAxisG2.transition().duration(500)
      .call(d3.axisLeft(y2).tickFormat(d3.format(",")));
  }

  updateChart(svg1Large, largeData, x1, y1, selectedMethods);
  updateChart(svg1Small, smallData, x2, y2, selectedMethods);
}

function updateChart(svg, data, x, y, methods) {
  const series = d3.stack().keys(methods)(data);
  
  const layers = svg.selectAll(".layer").data(series);
    
  const layersEnter = layers.enter()
    .append("g")
    .attr("class", "layer");
    
  layers.merge(layersEnter).attr("fill", d => color(d.key));
    
  layers.exit().remove();

  const bars = layers.merge(layersEnter).selectAll("rect").data(d => d);

  const barsEnterMerge = bars.enter()
    .append("rect")
    .merge(bars)
    .on("mousemove", (ev, d) => {
      svg.selectAll("rect")
        .style("opacity", 0.5);
      
      d3.select(ev.target)
        .style("opacity", 1)
        .style("stroke", "#333")
        .style("stroke-width", 1);
      
      const row = d.data;
      let tooltipHtml = `<strong>${row.JURISDICTION}</strong><br />Total fines: ${d3.format(",")(row.total)}`;
      methods.forEach(m => {
        tooltipHtml += `<br />${m} fines: ${d3.format(",")(row[m] || 0)}`;
      });
      tooltip1.style("opacity", 0.9)
        .html(tooltipHtml)
        .style("left", `${ev.pageX + 5}px`)
        .style("top", `${ev.pageY - 28}px`);
    })
    .on("mouseleave", () => {
      svg.selectAll("rect")
        .style("opacity", 1)
        .style("stroke", "none")
        .style("stroke-width", 0);
      
      tooltip1.style("opacity", 0);
    });

  if (isInitialRender) {
    barsEnterMerge
      .attr("x", d => x(d.data.JURISDICTION))
      .attr("y", d => y(d[1]))
      .attr("height", d => Math.max(0, y(d[0]) - y(d[1])))
      .attr("width", x.bandwidth());
  } else {
    barsEnterMerge
      .transition()
      .duration(500)
      .attr("x", d => x(d.data.JURISDICTION))
      .attr("y", d => y(d[1]))
      .attr("height", d => Math.max(0, y(d[0]) - y(d[1])))
      .attr("width", x.bandwidth());
  }

  bars.exit().remove();
}
