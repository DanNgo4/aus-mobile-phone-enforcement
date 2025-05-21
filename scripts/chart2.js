const svg = d3.select("#chart2")
  .append("svg")
    .attr("width",  width + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

d3.csv("data/cleaned_dataset_2.csv", d3.autoType).then(data => {
  data.forEach(d => {
    const date = d.START_DATE instanceof Date
      ? d.START_DATE
      : d3.timeParse("%Y-%m-%d")(d.START_DATE);

    d.month = date.getMonth();
  });

  const rollup = d3.rollup(
    data,
    v => d3.sum(v, d => d.FINES),
    d => d.JURISDICTION,
    d => d.month
  );

  const jurisdictions = Array.from(rollup.keys()).sort();
  const months        = d3.range(0, 12);

  const flat = [];
  jurisdictions.forEach(j => {
    months.forEach(m => {
      const val = rollup.get(j).get(m) ?? 0;
      flat.push({ jurisdiction: j, month: m, value: val });
    });
  });

  const x = d3.scaleBand()
    .domain(months)
    .range([0, width])
    .padding(0.05);

  const y = d3.scaleBand()
    .domain(jurisdictions)
    .range([0, height])
    .padding(0.05);

  const color = d3.scaleSequential()
    .interpolator(d3.interpolateBlues)
    .domain([0, d3.max(flat, d => d.value)]);

  svg.selectAll("rect.cell")
    .data(flat)
    .join("rect")
      .attr("class", "cell")
      .attr("x", d => x(d.month))
      .attr("y", d => y(d.jurisdiction))
      .attr("width",  x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("fill",   d => color(d.value))
      .on("mousemove", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${d.jurisdiction}</strong><br/>
              ${d3.timeFormat("%B")(new Date(2020, d.month, 1))}: ${d.value}`
          )
          .style("left",  (event.pageX + 10) + "px")
          .style("top",   (event.pageY - 28) + "px");
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));

  const xAxis = d3.axisTop(x)
    .tickFormat(m => d3.timeFormat("%b")(new Date(2023, m, 1)));

  const yAxis = d3.axisLeft(y);

  svg.append("g")
    .attr("class", "axis")
    .call(xAxis);

  svg.append("g")
    .attr("class", "axis")
    .call(yAxis);
});
