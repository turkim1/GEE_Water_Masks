var map = L.map('map', {
    center: [34.0, 9.0],
    zoom: 7
});

// Basemap layers
var openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 14,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var satelliteImagery = L.tileLayer('https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x} ', {
    maxZoom: 14,
    attribution: '&copy; <a href="https://www.esri.com/">ESRI</a>'
});

// Base layer control
var baseLayers = {
    "OpenStreetMap": openStreetMap,
    "Satellite Imagery": satelliteImagery
};

L.control.layers(baseLayers).addTo(map);

var waterLayer = null;
var waterBodyAreas = {};  // To track area changes over the years
var selectedWaterBodyId = null;
var chart = null;
var geoJsonData = {};  // Store all GeoJSON data for charting

// Initialize the chart
function initChart() {
    console.log("Initializing chart");
    var ctx = document.getElementById('chart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['2018', '2019', '2020', '2021', '2022', '2023'],
            datasets: [{
                label: 'Total Water Surface Area (sqm)',
                data: [],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#333'
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Year',
                        color: '#333'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Area (sqm)',
                        color: '#333'
                    },
                    beginAtZero: true
                }
            }
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

// Function to update the map style based on the selected water body
function updateLayerStyles() {
    if (waterLayer) {
        waterLayer.eachLayer(function(layer) {
            const featureId = layer.feature.properties.id;
            if (featureId === selectedWaterBodyId) {
                layer.setStyle({color: 'red', weight: 1, fillOpacity: 0.7});  // Highlight selected water body
            } else {
                layer.setStyle({color: 'blue', weight: 1, fillOpacity: 0.5});  // Default style
            }
        });
    }
}

// Function to load GeoJSON data for all years
function loadAllGeoJson() {
    console.log("Loading GeoJSON for all years");

    let years = ['2018', '2019', '2020', '2021', '2022', '2023'];
    let fetchPromises = years.map(year => fetch(`geojson/water_bodies_${year}.geojson`).then(response => response.json()));

    Promise.all(fetchPromises)
        .then(results => {
            results.forEach((data, index) => {
                const year = years[index];
                geoJsonData[year] = data;

                // Process the data for charting
                data.features.forEach(feature => {
                    var waterBodyId = feature.properties.id;
                    var area = parseFloat(feature.properties.area_sqm);

                    if (isNaN(area)) {
                        console.error(`Invalid area value for water body ${waterBodyId} in year ${year}: ${area}`);
                        return;  // Skip this feature if the area is invalid
                    }

                    if (!waterBodyAreas[waterBodyId]) {
                        waterBodyAreas[waterBodyId] = {};
                    }
                    waterBodyAreas[waterBodyId][year] = area;

                    console.log(`Added area for water body ${waterBodyId} in year ${year}:`, area);
                });
            });

            // Update chart with total surface area for all years
            updateTotalSurfaceChart();
            // Initial load of the selected year's data
            loadGeoJson(slider.value);
        })
        .catch(error => {
            console.error("Error loading GeoJSON files:", error);
        });
}

// Function to load and display the GeoJSON for a specific year
function loadGeoJson(year) {
    console.log(`Loading GeoJSON for year: ${year}`);
    
    // Remove any previously added water layer
    if (waterLayer) {
        map.removeLayer(waterLayer);
    }
    
    // Fetch and display the GeoJSON for the selected year
    if (geoJsonData[year]) {
        waterLayer = L.geoJSON(geoJsonData[year], {
            style: function(feature) {
                if (selectedWaterBodyId && feature.properties.id === selectedWaterBodyId) {
                    return {color: 'red', weight: 1, fillOpacity: 0.7};  // Highlight selected water body
                }
                return {color: 'blue', weight: 1, fillOpacity: 0.5};  // Default style
            },
            onEachFeature: function (feature, layer) {
                var waterBodyId = feature.properties.id;
                var area = feature.properties.area_sqm;

                // Ensure 'area' is a number
                area = parseFloat(area);

                if (isNaN(area)) {
                    console.error(`Invalid area value for water body ${waterBodyId} in year ${year}: ${area}`);
                    return;  // Skip this feature if the area is invalid
                }

                layer.on('click', function() {
                    console.log(`Water body clicked: ID ${waterBodyId}, Area: ${area}`);
                    selectedWaterBodyId = waterBodyId;
                    updateWaterBodyChart(waterBodyId);
                    updateLayerStyles();  // Update the layer styles to highlight the selected water body
                });
            }
        }).addTo(map);

        console.log("Water body areas after loading:", waterBodyAreas);
    } else {
        console.error(`GeoJSON data for year ${year} is not available.`);
    }
}

// Handle slider input
var slider = document.getElementById('slider');
var yearLabel = document.getElementById('year');
slider.addEventListener('input', function() {
    var year = slider.value;
    yearLabel.textContent = year;
    loadGeoJson(year);
});

// Load all GeoJSON data initially
initChart();
loadAllGeoJson();
