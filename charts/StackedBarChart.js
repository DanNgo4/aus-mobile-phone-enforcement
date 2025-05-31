const container = d3.select("#chart1");
container.select("svg").remove();

const tooltip1 = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

const chartsContainer = container.append("div")
  .style("display", "flex")
  .style("justify-content", "space-between")
  .style("width", fullWidth + "px")
  .style("margin", "0 auto");

const svg1Large = chartsContainer.append("div")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const svg1Small = chartsContainer.append("div")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const x1 = d3.scaleBand().padding(0.2);
const x2 = d3.scaleBand().padding(0.2);

const y1 = d3.scaleLinear().range([height, 0]);
const y2 = d3.scaleLinear().range([height, 0]);

const color = d3.scaleOrdinal()
  .domain(["Camera issued", "Police issued"])
  .range(["#1F77B4", "#FF7F0E"]);

const xAxisG1 = svg1Large.append("g")
  .attr("class", "x-axis")
  .attr("transform", `translate(0,${height})`);
const yAxisG1 = svg1Large.append("g")
  .attr("class", "y-axis");

const xAxisG2 = svg1Small.append("g")
  .attr("class", "x-axis")
  .attr("transform", `translate(0,${height})`);
const yAxisG2 = svg1Small.append("g")
  .attr("class", "y-axis");

container.insert("h2", ":first-child")
  .style("text-align", "center")
  .style("margin-bottom", "20px")
  .text("Fines by Jurisdiction and Detection Method");

svg1Large.append("text")
  .attr("transform", "rotate(-90)")
  .attr("y", -60)
  .attr("x", -height / 2)
  .attr("text-anchor", "middle")
  .text("Number of Fines");

svg1Small.append("text")
  .attr("transform", "rotate(-90)")
  .attr("y", -60)
  .attr("x", -height / 2)
  .attr("text-anchor", "middle")
  .text("Number of Fines");

svg1Large.append("text")
  .attr("x", width / 2)
  .attr("y", height + 60)
  .attr("text-anchor", "middle")
  .text("Jurisdiction");

svg1Small.append("text")
  .attr("x", width / 2)
  .attr("y", height + 60)
  .attr("text-anchor", "middle")
  .text("Jurisdiction");

d3.csv("data/cleaned_dataset_1.csv", d3.autoType).then(data => {
  const jurisdictions = Array.from(new Set(data.map(d => d.JURISDICTION))).sort();
  const ageGroups = Array.from(new Set(data.map(d => d.AGE_GROUP))).sort();
  const methods = Array.from(new Set(data.map(d => d.DETECTION_METHOD))).sort();
  
  function buildFilterDropdown(id, values) {
    const container = d3.select(`#${id}`);
    values.forEach(v => {
      const label = container.append("label");

      label.append("input")
        .attr("type", "checkbox")
        .attr("value", v)
        .property("checked", true)
        .on("change", update);

      label.append("span").text(v);
    });
  }

  buildFilterDropdown("ageGroupFilter", ageGroups);
  buildFilterDropdown("detectionMethodFilter", methods);
  buildFilterDropdown("jurisdictionFilter", jurisdictions); 

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const dropdown = e.target.closest(".filter-dropdown");
      e.stopPropagation();
      dropdown.classList.toggle("active");
    });
  });

  // Close dropdowns only when clicking outside any dropdown
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".filter-dropdown")) {
      document.querySelectorAll(".filter-dropdown").forEach(d => {
        d.classList.remove("active");
      });
    }
  });

  function update() {    
    const selectedAges = Array.from(document.querySelectorAll("#ageGroupFilter input:checked"))
                              .map(n => n.value);

    const selectedMethods = Array.from(document.querySelectorAll("#detectionMethodFilter input:checked"))
                                 .map(n => n.value);

    const selectedStates = Array.from(document.querySelectorAll("#jurisdictionFilter input:checked"))
                                .map(n => n.value);

    const filtered = data.filter(d =>
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

    const sumData = Array.from(sumMap, ([jur, vals]) => ({ JURISDICTION: jur, ...vals }));
    
    sumData.forEach(d => {
      selectedMethods.forEach(m => {
        if (!(m in d)) d[m] = 0;
      });
    });
    
    const largeJurs = ["NSW", "QLD", "VIC"];
    const largeData = sumData.filter(d => largeJurs.includes(d.JURISDICTION));
    const smallData = sumData.filter(d => !largeJurs.includes(d.JURISDICTION));

    x1.domain(largeData.map(d => d.JURISDICTION))
      .range([0, width]);
    x2.domain(smallData.map(d => d.JURISDICTION))
      .range([0, width]);

    y1.domain([0, d3.max(largeData, d => d.total) * 1.1]);
    y2.domain([0, d3.max(smallData, d => d.total) * 1.1]);

    xAxisG1.call(d3.axisBottom(x1))
      .selectAll("text")      
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    xAxisG2.call(d3.axisBottom(x2))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");
    
    yAxisG1.transition()
    .duration(500)
    .call(d3.axisLeft(y1)
    .tickFormat(d3.format(",")));    
    
    yAxisG2.transition()
      .duration(500)
      .call(d3.axisLeft(y2)
      .tickFormat(d3.format(",")));

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

    bars.enter()
      .append("rect")
      .merge(bars)
      .on("mousemove", (ev, d) => {
        const row = d.data;

        let tooltipHtml = `
          <strong>
            ${row.JURISDICTION}
          </strong>
          <br />
          Total fines: ${d3.format(",")(row.total)}
        `;

        methods.forEach(m => {
          tooltipHtml += `<br />${m} fines: ${d3.format(",")(row[m])}`;
        });

        tooltip1.style("opacity", 0.9)
          .html(tooltipHtml)
          .style("left", `${ev.pageX + 5}px`)
          .style("top", `${ev.pageY - 28}px`);
      })
      .on("mouseleave", () => tooltip1.style("opacity", 0))
      .transition()
      .duration(500)
      .attr("x", d => x(d.data.JURISDICTION))
      .attr("y", d => y(d[1]))
      .attr("height", d => Math.max(0, y(d[0]) - y(d[1])))
      .attr("width", x.bandwidth());

    bars.exit().remove();
  }

  update();
}).catch(err => console.error("Error loading CSV:", err));
