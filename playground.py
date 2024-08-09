import geopandas

# Load the data
water = geopandas.read_file('./geojson/water_bodies_2023.geojson')

# filter the data with lowest shape and biggest area
water = water[water['shape'] <0.1]
water = water[water['area_sqm'] > 1000]

print(water.head())

plot = water.head().plot()
plot.set_title('Water Bodies')
plot.set_axis_off()
plot.set_aspect('equal')
plot.show()