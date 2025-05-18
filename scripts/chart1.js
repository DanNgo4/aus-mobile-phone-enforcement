const margin1 = { top: 50, right: 20, bottom: 100, left: 80 };
const fullWidth = 1200;
const width1  = (fullWidth/2) - margin1.left - margin1.right;
const height1 = 600 - margin1.top  - margin1.bottom;

const container1 = d3.select('#chart1');
container1.select('svg').remove();
container1.select('.filter-container').remove();

d3.select('.tooltip').remove();

const tooltip1 = d3.select('body')
  .append('div')
  .attr('class', 'tooltip')
  .style('opacity', 0);

const chartsContainer = container1
  .append('div')
  .style('display', 'flex')
  .style('justify-content', 'space-between')
  .style('width', fullWidth + 'px')
  .style('margin', '0 auto');

const svg1Large = chartsContainer.append('div')
  .append('svg')
    .attr('width', width1 + margin1.left + margin1.right)
    .attr('height', height1 + margin1.top + margin1.bottom)
  .append('g')
    .attr('transform', `translate(${margin1.left},${margin1.top})`);

const svg1Small = chartsContainer.append('div')
  .append('svg')
    .attr('width', width1 + margin1.left + margin1.right)
    .attr('height', height1 + margin1.top + margin1.bottom)
  .append('g')
    .attr('transform', `translate(${margin1.left},${margin1.top})`);

container1.insert('h2', ':first-child')
  .style('text-align', 'center')
  .style('margin-bottom', '20px')
  .text('Fines by Jurisdiction and Detection Method');

svg1Large.append('text')
  .attr('transform', 'rotate(-90)')
  .attr('y', -60)
  .attr('x', -height1 / 2)
  .attr('text-anchor', 'middle')
  .text('Number of Fines');

svg1Small.append('text')
  .attr('transform', 'rotate(-90)')
  .attr('y', -60)
  .attr('x', -height1 / 2)
  .attr('text-anchor', 'middle')
  .text('Number of Fines');

svg1Large.append('text')
  .attr('x', width1 / 2)
  .attr('y', height1 + 60)
  .attr('text-anchor', 'middle')
  .text('Jurisdiction');

svg1Small.append('text')
  .attr('x', width1 / 2)
  .attr('y', height1 + 60)
  .attr('text-anchor', 'middle')
  .text('Jurisdiction');

d3.csv('data/cleaned_dataset_1.csv', d3.autoType).then(data => {
  
  const jurisdictions = Array.from(new Set(data.map(d => d.JURISDICTION))).sort();
  const ageGroups = Array.from(new Set(data.map(d => d.AGE_GROUP))).sort();
  const methods = Array.from(new Set(data.map(d => d.DETECTION_METHOD))).sort();
  
  const filterContainer = container1
    .insert('div', ':first-child')
    .attr('class', 'filter-container');

  function buildCheckboxGroup(name, values) {
    const grp = filterContainer.append('div').attr('class', 'filter-group');
    grp.append('span').text(name + ': ');
    values.forEach(v => {
      const lbl = grp.append('label').style('margin-right', '0.5rem');
      lbl.append('input')
        .attr('type', 'checkbox')
        .attr('name', name)
        .attr('value', v)
        .property('checked', true)
        .on('change', update);
      lbl.append('span').text(v);
    });
  }

  buildCheckboxGroup('AgeGroup', ageGroups);
  buildCheckboxGroup('DetectionMethod', methods);
  buildCheckboxGroup('Jurisdiction', jurisdictions);

  const x1 = d3.scaleBand()
    .padding(0.2);
  
  const x2 = d3.scaleBand()
    .padding(0.2);
  
  const y1 = d3.scaleLinear()
    .range([height1, 0]);
  
  const y2 = d3.scaleLinear()
    .range([height1, 0]);

  const color = d3.scaleOrdinal()
    .domain(methods)
    .range(['#1f77b4', '#ff7f0e']);

  const xAxisG1 = svg1Large.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${height1})`);

  const yAxisG1 = svg1Large.append('g')
    .attr('class', 'y-axis');

  const xAxisG2 = svg1Small.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${height1})`);

  const yAxisG2 = svg1Small.append('g')
    .attr('class', 'y-axis');

  svg1Large.append("text")
    .attr("x", width1 / 2)
    .attr("y", 0 - (margin1.top / 2))
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Major Jurisdictions (NSW, QLD, VIC)");

  svg1Small.append("text")
    .attr("x", width1 / 2)
    .attr("y", 0 - (margin1.top / 2))
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Other Jurisdictions");

  function update() {
    const selAges = filterContainer.selectAll("input[name='AgeGroup']:checked").nodes().map(n => n.value);
    const selMethods = filterContainer.selectAll("input[name='DetectionMethod']:checked").nodes().map(n => n.value);
    const selJurs = filterContainer.selectAll("input[name='Jurisdiction']:checked").nodes().map(n => n.value);

    const filtered = data.filter(d =>
      selAges.includes(d.AGE_GROUP) &&
      selMethods.includes(d.DETECTION_METHOD) &&
      selJurs.includes(d.JURISDICTION)
    );
    
    const sumMap = d3.rollup(
      filtered,
      v => {
        const totals = { total: 0 };
        selMethods.forEach(m => { 
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
      selMethods.forEach(m => {
        if (!(m in d)) d[m] = 0;
      });
    });

    const largeJurs = ['NSW', 'QLD', 'VIC'];
    const largeData = sumData.filter(d => largeJurs.includes(d.JURISDICTION));
    const smallData = sumData.filter(d => !largeJurs.includes(d.JURISDICTION));

    x1.domain(largeData.map(d => d.JURISDICTION))
      .range([0, width1]);
    x2.domain(smallData.map(d => d.JURISDICTION))
      .range([0, width1]);

    y1.domain([0, d3.max(largeData, d => d.total) * 1.1]);
    y2.domain([0, d3.max(smallData, d => d.total) * 1.1]);

    xAxisG1.call(d3.axisBottom(x1))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    xAxisG2.call(d3.axisBottom(x2))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    yAxisG1.transition().duration(500)
      .call(d3.axisLeft(y1).tickFormat(d3.format(",")));

    yAxisG2.transition().duration(500)
      .call(d3.axisLeft(y2).tickFormat(d3.format(",")));   
    updateChart(svg1Large, largeData, x1, y1, selMethods);
    updateChart(svg1Small, smallData, x2, y2, selMethods);
  }

  function updateChart(svg, data, x, y, methods) {
    const series = d3.stack()
      .keys(methods)
      (data);
    
    const layers = svg.selectAll(".layer")
      .data(series);
      
    const layersEnter = layers.enter()
      .append("g")
      .attr("class", "layer");
      
    layers.merge(layersEnter)
      .attr("fill", d => color(d.key));
      
    layers.exit().remove();

    const bars = layers.merge(layersEnter).selectAll("rect")
      .data(d => d);

    bars.enter()
      .append("rect")
      .merge(bars)      .on("mouseover", (ev, d) => {
        const row = d.data;
        let tooltipHtml = `<strong>${row.JURISDICTION}</strong><br>Total: ${d3.format(",")(row.total)}`;
        methods.forEach(m => {
          tooltipHtml += `<br>${m}: ${d3.format(",")(row[m])}`;
        });
        tooltip1
          .style("opacity", 0.9)
          .html(tooltipHtml)
          .style("left", `${ev.pageX + 5}px`)
          .style("top", `${ev.pageY - 28}px`);
      })
      .on("mouseout", () => tooltip1.style("opacity", 0))
      .transition()
      .duration(500)
      .attr("x", d => x(d.data.JURISDICTION))
      .attr("y", d => y(d[1]))
      .attr("height", d => Math.max(0, y(d[0]) - y(d[1])))
      .attr("width", x.bandwidth());

    bars.exit().remove();
  }

  update();

}).catch(err => console.error('Error loading CSV:', err));
