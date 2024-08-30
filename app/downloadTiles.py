import os
import gc
import argparse
import urllib.request
from time import sleep
from datetime import datetime

# Custom print function with time tracking
last_time = datetime.now()

def custom_print(message: str):
    global last_time
    current_time = datetime.now()
    duration = current_time - last_time
    print(f'{current_time.strftime("%Y-%m-%d %H:%M:%S")} - {message} (Duration since last operation: {duration})')
    last_time = current_time
 
version = "v2.0"
ap = argparse.ArgumentParser()
ap.add_argument("--output-dir", required=True, help="output directory")
args = vars(ap.parse_args())

output_dir = args['output_dir']

for city in ["munich", "stockholm", "gothenborg"]:
    # Create necessary directories
    pulse_tiles_dir = os.path.join(output_dir, 'pulse_tiles', city)
    zips_dir = os.path.join(output_dir, 'zips', city)
    os.makedirs(pulse_tiles_dir, exist_ok=True)
    os.makedirs(zips_dir, exist_ok=True)

    custom_print(f'Setting up {city}...')
    print(pulse_tiles_dir, zips_dir)

    for zoom_level in range(18, 7, -1):
        link = f'https://pulseoverlaystorage.blob.core.windows.net/cities/{city}-{version}/{city}-{zoom_level}.zip'
        zipfile_path = os.path.join(zips_dir, f'{city}-{zoom_level}.zip')
        custom_print(zipfile_path)
        retry_count = 0
        while retry_count < 3:
            try:
                urllib.request.urlretrieve(link, zipfile_path)
                break
            except:
                print(f"Failed to download {zipfile_path}, retry_count: {retry_count}")
                retry_count += 1
                sleep(5)
            
    custom_print(f"Done with {city}")

    print(os.listdir(output_dir))

gc.collect()
