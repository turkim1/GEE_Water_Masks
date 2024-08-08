var map = L.map('map').setView([34.0, 9.0], 7);  // Centered over Tunisia

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 14,
    minZoom: 7
}).addTo(map);

var waterLayer = null;
var waterBodiesData = {};

// Function to load and display GeoJSON for the selected year
function loadGeoJson(year) {
    var currentZoom = map.getZoom();
    var currentCenter = map.getCenter();

    if (waterLayer) {
        map.removeLayer(waterLayer);
    }

    fetch(`geojson/Water_Mask_${year}.geojson`)
        .then(response => response.json())
        .then(data => {
            waterLayer = L.geoJSON(data, {
                onEachFeature: function (feature, layer) {
                    layer.on('click', function () {
                        showWaterBodyDetails(feature);
                    });

                    // Calculate and store area for each water body
                    var id = feature.properties.id || `body_${feature.properties.index}`;
                    if (!waterBodiesData[id]) {
                        waterBodiesData[id] = {};
                    }
                    var coordinates = feature.geometry.coordinates;
                    var polygon = L.polygon(coordinates);
                    var area = Math.round(L.GeometryUtil.geodesicArea(polygon.getLatLngs()[0]));

                    waterBodiesData[id][year] = area;
                }
            }).addTo(map);
            if (!map.getBounds().contains(currentCenter)) {
                map.fitBounds(waterLayer.getBounds(), {
                    maxZoom: currentZoom
                });
            }
            map.setView(currentCenter, currentZoom);  // Maintain current view
        })
        .catch(error => {
            console.error("Error loading GeoJSON:", error);
        });
}

// Function to display water body details
function showWaterBodyDetails(feature) {
    var id = feature.properties.id || `body_${feature.properties.index}`;
    var areas = waterBodiesData[id];
    if (!areas) return;

    var years = Object.keys(areas);
    var highestYear = years[0];
    var lowestYear = years[0];
    var highestExtent = areas[highestYear];
    var lowestExtent = areas[lowestYear];

    years.forEach(year => {
        if (areas[year] > highestExtent) {
            highestExtent = areas[year];
            highestYear = year;
        }
        if (areas[year] < lowestExtent) {
            lowestExtent = areas[year];
            lowestYear = year;
        }
    });

    document.getElementById('highest-year').textContent = highestYear;
    document.getElementById('lowest-year').textContent = lowestYear;
    document.getElementById('highest-extent').textContent = highestExtent.toLocaleString();
    document.getElementById('lowest-extent').textContent = lowestExtent.toLocaleString();

    // Update the chart with the area evolution data
    updateChart(years, Object.values(areas));
}

// Function to load all years' data at once
function loadAllYearsData() {
    var years = ['2018', '2019', '2020', '2021', '2022', '2023'];
    years.forEach(function(year) {
        loadGeoJson(year);  // Load the data to populate the waterBodiesData
    });
}

// Function to update the chart with new data
function updateChart(labels, data) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
}

// Initialize the chart
var ctx = document.getElementById('chart').getContext('2d');
var chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],  // Year labels will be set dynamically
        datasets: [{
            label: 'Water Body Surface Area (sqm)',
            data: [],  // Area data will be set dynamically
            borderColor: 'blue',
            fill: false
        }]
    }
});

// Set up the slider
var slider = document.getElementById('slider');
var yearLabel = document.getElementById('year');
slider.addEventListener('input', function() {
    var year = slider.value;
    yearLabel.textContent = year;
    loadGeoJson(year);
});

// Load the initial map with the starting year
loadGeoJson(slider.value);

// Load data for all years to initialize the waterBodiesData object
loadAllYearsData();
