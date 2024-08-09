import geopandas as gpd
from shapely.geometry import Polygon
import os

def assign_ids(base_gdf, compare_gdf, id_column='id'):
    # Ensure the GeoDataFrames have a spatial index
    base_gdf = base_gdf.set_index(id_column)
    base_gdf = base_gdf.set_crs(epsg=4326)  # Adjust CRS as needed
    compare_gdf = compare_gdf.set_crs(epsg=4326)
    
    # Create a spatial index for the base GeoDataFrame
    base_sindex = base_gdf.sindex
    
    # Function to find the best match for a given geometry
    def find_best_match(geom):
        possible_matches_index = list(base_sindex.intersection(geom.bounds))
        possible_matches = base_gdf.iloc[possible_matches_index]
        if len(possible_matches) > 0:
            # Calculate intersection over union (IoU) for all possible matches
            ious = possible_matches.geometry.apply(lambda x: geom.intersection(x).area / geom.union(x).area)
            best_match = ious.idxmax()
            if ious[best_match] > 0.5:  # Adjust threshold as needed
                return best_match
        return None
    
    # Apply the matching function to each geometry in the compare GeoDataFrame
    compare_gdf[id_column] = compare_gdf.geometry.apply(find_best_match)
    
    # Assign new IDs to unmatched water bodies
    max_id = int(base_gdf.index.max())  # Ensure max_id is an integer
    null_count = int(compare_gdf[id_column].isnull().sum())  # Ensure null count is an integer
    new_ids = range(max_id + 1, max_id + 1 + null_count)
    compare_gdf.loc[compare_gdf[id_column].isnull(), id_column] = new_ids
    
    return compare_gdf
    
    # Apply the matching function to each geometry in the compare GeoDataFrame
    compare_gdf[id_column] = compare_gdf.geometry.apply(find_best_match)
    
    # Assign new IDs to unmatched water bodies
    max_id = base_gdf.index.max()
    compare_gdf.loc[compare_gdf[id_column].isnull(), id_column] = range(max_id + 1, max_id + 1 + compare_gdf[id_column].isnull().sum())
    
    return compare_gdf


# Load your GeoJSONs for each year
gdf_2017 = gpd.read_file('./web/geojson/Water_Mask_2017.geojson')
gdf_2018 = gpd.read_file('./web/geojson/Water_Mask_2018.geojson')
gdf_2019 = gpd.read_file('./web/geojson/Water_Mask_2019.geojson')
gdf_2020 = gpd.read_file('./web/geojson/Water_Mask_2020.geojson')
gdf_2021 = gpd.read_file('./web/geojson/Water_Mask_2021.geojson')
gdf_2022 = gpd.read_file('./web/geojson/Water_Mask_2022.geojson')
gdf_2023 = gpd.read_file('./web/geojson/Water_Mask_2023.geojson')

# Assign initial IDs to the base year (2018)
gdf_2017['id'] = range(1, len(gdf_2017) + 1)

# Assign IDs for subsequent years
gdf_2018 = assign_ids(gdf_2017, gdf_2018)
gdf_2019 = assign_ids(gdf_2018, gdf_2019)
gdf_2020 = assign_ids(gdf_2019, gdf_2020)
gdf_2021 = assign_ids(gdf_2020, gdf_2021)
gdf_2022 = assign_ids(gdf_2021, gdf_2022)
gdf_2023 = assign_ids(gdf_2022, gdf_2023)


# Save the results
gdf_2017.to_file('./web/geojson/water_bodies_2017.geojson', driver='GeoJSON')
gdf_2018.to_file('./web/geojson/water_bodies_2018.geojson', driver='GeoJSON')
gdf_2019.to_file('./web/geojson/water_bodies_2019.geojson', driver='GeoJSON')
gdf_2020.to_file('./web/geojson/water_bodies_2020.geojson', driver='GeoJSON')
gdf_2021.to_file('./web/geojson/water_bodies_2021.geojson', driver='GeoJSON')
gdf_2022.to_file('./web/geojson/water_bodies_2022.geojson', driver='GeoJSON')
gdf_2023.to_file('./web/geojson/water_bodies_2023.geojson', driver='GeoJSON')

