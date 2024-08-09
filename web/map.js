var map = L.map('map').setView([34.0, 9.0], 7);  // Centered over Tunisia
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 14,  // Limit the maximum zoom
}).addTo(map);

var waterLayer = null;
var waterBodyAreas = {};  // To track area changes over the years
var selectedWaterBodyId = null;
var chart = null;

// Initialize the chart
function initChart() {
    console.log("Initializing chart");
    var ctx = document.getElementById('chart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['2018', '2019', '2020', '2021', '2022', '2023'],  // Fixed year range
            datasets: [{
                label: 'Total Water Surface Area (sqm)',
                data: [],
                borderColor: 'blue',
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Function to update the chart with new data
function updateChart(data) {
    console.log("Updating chart with data:", data);
    chart.data.datasets[0].data = data;
    chart.update();
}

// Function to calculate total area for a given year
function calculateTotalArea(year) {
    let totalArea = 0;
    for (const waterBodyId in waterBodyAreas) {
        if (waterBodyAreas[waterBodyId][year]) {
            totalArea += waterBodyAreas[waterBodyId][year];
        }
    }
    console.log(`Total area for year ${year}:`, totalArea);
    return totalArea;
}

// Function to update the chart for the selected water body
function updateWaterBodyChart(waterBodyId) {
    console.log(`Updating chart for water body ID: ${waterBodyId}`);
    const areas = [];
    for (let year = 2018; year <= 2023; year++) {
        areas.push(waterBodyAreas[waterBodyId] && waterBodyAreas[waterBodyId][year] ? waterBodyAreas[waterBodyId][year] : 0);
    }
    console.log("Areas for selected water body:", areas);
    chart.data.datasets[0].label = `Water Body ID ${waterBodyId} Area (sqm)`;
    updateChart(areas);
}

// Function to update the chart with total surface area across all years
function updateTotalSurfaceChart() {
    console.log("Updating total surface chart");
    const totalAreas = [];
    for (let year = 2018; year <= 2023; year++) {
        totalAreas.push(calculateTotalArea(year));
    }
    console.log("Total areas across years:", totalAreas);
    chart.data.datasets[0].label = 'Total Water Surface Area (sqm)';
    updateChart(totalAreas);
}

// Function to load and display the GeoJSON for a specific year
function loadGeoJson(year) {
    console.log(`Loading GeoJSON for year: ${year}`);
    if (waterLayer) {
        map.removeLayer(waterLayer);
    }

    fetch(`geojson/water_bodies_${year}.geojson`)
        .then(response => response.json())
        .then(data => {
            console.log(`GeoJSON data loaded for year ${year}:`, data);
            waterLayer = L.geoJSON(data, {
                style: function(feature) {
                    if (selectedWaterBodyId && feature.properties.id === selectedWaterBodyId) {
                        return {color: 'red', weight: 1, fillOpacity: 0.7};  // Highlight selected water body
                    }
                    return {color: 'blue', weight: 1, fillOpacity: 0.5};  // Reduced border weight
                },
                onEachFeature: function (feature, layer) {
                    var waterBodyId = feature.properties.id;
                    var area = parseFloat(feature.properties.area_sqm);

                    if (!waterBodyAreas[waterBodyId]) {
                        waterBodyAreas[waterBodyId] = {};
                    }
                    waterBodyAreas[waterBodyId][year] = area;

                    console.log(`Added area for water body ${waterBodyId} in year ${year}:`, area);  // Debugging line

                    layer.on('click', function() {
                        console.log(`Water body clicked: ID ${waterBodyId}, Area: ${area}`);
                        selectedWaterBodyId = waterBodyId;
                        updateWaterBodyChart(waterBodyId);
                        loadGeoJson(year);  // Reload to highlight selected water body
                    });
                }
            }).addTo(map);

            console.log("Water body areas after loading:", waterBodyAreas);

            if (!selectedWaterBodyId) {
                updateTotalSurfaceChart();
            } else {
                updateWaterBodyChart(selectedWaterBodyId);
            }
        })
        .catch(error => {
            console.error("Error loading GeoJSON:", error);
        });
}


// Handle slider input
var slider = document.getElementById('slider');
var yearLabel = document.getElementById('year');
slider.addEventListener('input', function() {
    var year = slider.value;
    yearLabel.textContent = year;
    loadGeoJson(year);
});

// Load the initial map with the default year
initChart();
loadGeoJson(slider.value);