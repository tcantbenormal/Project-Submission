import sys
import json
import os
from rasterstats import zonal_stats
import warnings

warnings.filterwarnings('ignore')

# We assume this script is in server/scripts, so TIFFS_DIR is in server/geodata/clipped_tiffs
TIFFS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'geodata', 'clipped_tiffs'))

def main():
    try:
        input_data = json.loads(sys.stdin.read())
        geojson = input_data.get('geojson')
        city_ids = input_data.get('city_ids', [1,2,3])
        
        city_map = {1: 'ISLD', 2: 'KHI', 3: 'LHR'}
        raster_types = ['PVOUT', 'DNI', 'DIF', 'GHI', 'GTI', 'OPTA', 'TEMP', 'TERRAIN']
        
        results = {}
        for r_type in raster_types:
            results[r_type] = []
            
        for cid in city_ids:
            city_code = city_map.get(cid)
            if not city_code: continue
            
            for r_type in raster_types:
                tiff_path = os.path.join(TIFFS_DIR, f"{city_code}_{r_type}.tif")
                if os.path.exists(tiff_path):
                    stats = zonal_stats(geojson, tiff_path, stats="mean")
                    if stats and stats[0] and stats[0]['mean'] is not None:
                        results[r_type].append(stats[0]['mean'])
        
        # Average across cities if the polygon spans multiple
        final_stats = {}
        for r_type, vals in results.items():
            if vals:
                final_stats[r_type] = sum(vals) / len(vals)
            else:
                final_stats[r_type] = None
                
        print(json.dumps({"success": True, "stats": final_stats}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    main()
