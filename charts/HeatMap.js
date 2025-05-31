const container2 = d3.select("#chart2");
container2.select("svg").remove();

const tooltip2 = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

const svg = container2
  .append("svg")
    .attr("width",  width + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

container2.insert("h2", ":first-child")
  .style("text-align", "center")
  .style("margin-bottom", "20px")
  .text("Fines by Jurisdiction and Month");

svg.append("text")
  .attr("transform", "rotate(-90)")
  .attr("y", -60)
  .attr("x", -height / 2)
  .attr("text-anchor", "middle")
  .text("Jurisdiction");

svg.append("text")
  .attr("x", width / 2)
  .attr("y", -30)
  .attr("text-anchor", "middle")
  .text("Month");

d3.csv("data/cleaned_dataset_2.csv", d3.autoType).then(data => {
  const parseDate = d3.timeParse("%Y-%m-%d");
  
  const jurisdictions = Array.from(new Set(data.map(d => d.JURISDICTION))).sort();
  const ageGroups = Array.from(new Set(data.map(d => d.AGE_GROUP))).sort();
  const methods = Array.from(new Set(data.map(d => d.DETECTION_METHOD))).sort();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function buildHeatmapFilterDropdown(id, values) {
    const container = d3.select(`#${id}`);
    values.forEach(v => {
      const label = container.append("label");

      label.append("input")
        .attr("type", "checkbox")
        .attr("value", v)
        .property("checked", true)
        .on("change", updateHeatmap);

      label.append("span").text(v);
    });
  }

  buildHeatmapFilterDropdown("heatmapAgeGroupFilter", ageGroups);
  buildHeatmapFilterDropdown("heatmapDetectionMethodFilter", methods);
  buildHeatmapFilterDropdown("heatmapJurisdictionFilter", jurisdictions);
  buildHeatmapFilterDropdown("heatmapMonthFilter", monthNames);

  document.querySelectorAll("#chart2 .filter-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const dropdown = e.target.closest(".filter-dropdown");
      e.stopPropagation();
      dropdown.classList.toggle("active");
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#chart2 .filter-dropdown")) {
      document.querySelectorAll("#chart2 .filter-dropdown").forEach(d => {
        d.classList.remove("active");
      });
    }
  });

  function updateHeatmap() {
    const selectedAges = Array.from(document.querySelectorAll("#heatmapAgeGroupFilter input:checked"))
                              .map(n => n.value);
    const selectedMethods = Array.from(document.querySelectorAll("#heatmapDetectionMethodFilter input:checked"))
                                 .map(n => n.value);
    const selectedJurisdictions = Array.from(document.querySelectorAll("#heatmapJurisdictionFilter input:checked"))
                                      .map(n => n.value);
    const selectedMonthNames = Array.from(document.querySelectorAll("#heatmapMonthFilter input:checked"))
                                   .map(n => n.value);
    
    const selectedMonths = selectedMonthNames.map(name => monthNames.indexOf(name));

    const filteredData = data.filter(d =>
      selectedAges.includes(d.AGE_GROUP) &&
      selectedMethods.includes(d.DETECTION_METHOD) &&
      selectedJurisdictions.includes(d.JURISDICTION)
    );

    const records = [];
    filteredData.forEach(d => {
      const fines = +d.FINES;
      const jurisdiction = d.JURISDICTION;

      if (jurisdiction === "QLD") {
        // split QLD fines across its full date span
        const perMonth = fines / 12;

        for (let i = 0; i < 12; i++) {
          const month = i;
          
          if (selectedMonths.includes(month)) {
            records.push({ jurisdiction, month, fines: perMonth });
          }
        }
      } else {
        const date = d.START_DATE instanceof Date
          ? d.START_DATE
          : parseDate(d.START_DATE);

        const month = date.getMonth();

        if (selectedMonths.includes(month)) {
          records.push({ jurisdiction, month, fines });
        }
      }
    });

    const rollup = d3.rollup(
      records,
      v => d3.sum(v, r => r.fines),
      r => r.jurisdiction,
      r => r.month
    );

    const filteredJurisdictions = selectedJurisdictions.filter(
      j => rollup.has(j)
    );
    const months = selectedMonths;

    const cells = [];
    filteredJurisdictions.forEach(j => {
      months.forEach(m => {
        const val = rollup.get(j).get(m) ?? 0;
        cells.push({ jurisdiction: j, month: m, value: val });
      });
    });

    const x = d3.scaleBand()
      .domain(months)
      .range([0, width])
      .padding(0.05);

    const y = d3.scaleBand()
      .domain(filteredJurisdictions)
      .range([0, height])
      .padding(0.05);

    const color = d3.scaleSequential()
      .interpolator(d3.interpolateBlues)
      .domain([0, d3.max(cells, d => d.value)]);

    const cellSelection = svg.selectAll("rect.cell")
      .data(cells, d => `${d.jurisdiction}-${d.month}`);

    cellSelection.exit().remove();

    cellSelection.enter()
      .append("rect")
      .attr("class", "cell")
      .merge(cellSelection)
      .transition()
      .duration(500)
      .attr("x", d => x(d.month))
      .attr("y", d => y(d.jurisdiction))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("fill", d => color(d.value))
      .attr("stroke", "#333")
      .attr("stroke-width", 0.5);

    svg.selectAll("rect.cell")
      .on("mousemove", (event, d) => {
        tooltip2
          .style("opacity", 1)
          .html(
            `<strong>${d.jurisdiction}</strong>
            <br/>
            ${d3.timeFormat("%B")(new Date(2023, d.month, 1))}: ${d3.format(",")(d.value)}`
          )
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseleave", () => tooltip2.style("opacity", 0));

    const xAxis = d3.axisTop(x)
      .tickFormat(m => d3.timeFormat("%b")(new Date(2023, m, 1)));

    const yAxis = d3.axisLeft(y);

    svg.select(".x-axis").remove();
    svg.select(".y-axis").remove();

    svg.append("g")
      .attr("class", "x-axis")
      .call(xAxis);

    svg.append("g")
      .attr("class", "y-axis")
      .call(yAxis);
  }

  updateHeatmap();
});
