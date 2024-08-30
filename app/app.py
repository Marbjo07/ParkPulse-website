from flask_cors import CORS
from flask import Flask, request, jsonify, render_template, send_file, Response, make_response

import io
import os
import sys
import math
import json
import signal
import hashlib
import secrets
import requests
import threading
import numpy as np
from PIL import Image
from math import floor, ceil 
from typing import Tuple, Dict
from werkzeug.utils import secure_filename
from brf_name_finder import BRFNameFinder
from session import Session, post_request_access_manager

app = Flask(__name__, static_folder="src", template_folder='src')
app.config['SECRET_KEY'] = secrets.token_hex(32)  
CORS(app) # This will enable CORS for all routes

if os.environ['FLASK_ENV'] == "development":
    SITE_URL = "http://localhost:5000"
    ACCESS_MANAGER_URL = 'http://accessmanager:5000'
else:
    SITE_URL = "https://parkpulse-web.azurewebsites.net/"
    ACCESS_MANAGER_URL = os.environ['ACCESS_MANAGER_URL']

DEVELOPER = 'dev'
PATH_TO_IMAGE_TILES = os.environ['PATH_TO_IMAGE_TILES']

city_azure_key_dict:Dict[str, str] = {
    'stockholm': os.environ['AZURE_KEY_SWEDEN'],
    'munich': os.environ['AZURE_KEY_GERMANY'],
    'gothenborg': os.environ['AZURE_KEY_SWEDEN'],
    DEVELOPER: os.environ['AZURE_KEY_DEV'],
}

citySearchAreaMap:Dict[str, list[Tuple[int, int]]] = {
    'stockholm':  [(144024, 76942), (144239, 77221)],  
    'munich':  [(139376, 90800), (139608, 91056)],  
    'gothenborg':  [(139600, 79272), (139864, 79496)]    
}

user_signup_token_dict = {}

brf_search_engine = BRFNameFinder(save_path='cache.json', load_cache=True)
        
sessions: Dict[str, Session] = {}
user_auth_hash_dict: Dict[str, str] = {} # a dictonary of username: auth_hash, used to verify that request are coming from access manager

def authenticate_user(username:str, password_hash:str) -> Tuple[bool, bool]:    
    request_body = {'username':username, 'password_hash':password_hash}
    response = post_request_access_manager('/authenticate_user', request_body)

    if not response['authenticated']:
        return False, False
    
    assert has_all_required_fields(response, ['has_sword', 'auth_hash'])
    
    has_sword = response['has_sword']

    # update user_auth_hash_dict
    user_auth_hash_dict[username] = response['auth_hash']

    print("response:", response)
    return True, has_sword

def has_all_required_fields(data_object:Dict[str, any], fields:list[str]) -> bool:
    return data_object and all(key in data_object for key in fields)

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    if 'username' not in data or 'password_hash' not in data:
        return jsonify({'error': 'Invalid request, must provide username and password_hash'}), 400
    
    username = data['username']
    password_hash = data['password_hash']

    authenticated, has_sword = authenticate_user(username, password_hash)
    if authenticated:
        new_session = Session(username, has_sword)
        if username in sessions:
            sessions[username] = new_session
        else:
            sessions.update({username: new_session})
        
        disabled, session_key = new_session.get_key()
        assert disabled == False, "New session is invalid?"
        
        response = make_response("Logged in successfully")
        response.set_cookie('session_key', session_key, httponly=True, secure=True, samesite='Strict')

        return response 
    else:
        return jsonify({'message': 'Authentication failed'}), 401

@app.route('/complete_user_setup', methods=["POST"])
def complete_user_setup():
    
    data = request.json

    if 'username' not in data or 'password_hash' not in data:
        return jsonify({'error', 'Invalid request, must provide username and password_hash'}), 400
    
    username = data['username']
    password_hash = data['password_hash']

    if username not in user_signup_token_dict:
        return jsonify({'error': 'User not found'}), 400 

    token = user_signup_token_dict[username]   

    data = json.loads(json.dumps({
        'username':username, 
        'password_hash':password_hash,
        'token': token
    }))

    response = requests.post(url=f'{ACCESS_MANAGER_URL}/finish_onboarding', json=request.json)
    return jsonify({"response": response.text}), response.status_code 


@app.route('/disable_user_session', methods=['POST'])
def disable_user_session():

    data = request.json

    if not has_all_required_fields(data, ['username', 'auth_str']):
        return jsonify({'error': 'Invalid request, must provide username and auth_str'}), 400
    
    username = data['username']
    auth_str = data['auth_str']

    if username not in sessions:
        return jsonify({'error': 'User is not logged in'}), 400
    
    auth_hash = hashlib.sha256(auth_str.encode()).hexdigest()

    if auth_hash != user_auth_hash_dict[username]:
        return jsonify({'error': 'Unable to authenticate'}), 401
       
    sessions[username].disable_session()
    return jsonify({'message': 'Disabled user session successfully'}), 200

@app.route('/list_available_cities', methods=['POST'])
def list_available_cities():
    data = request.json

    if not has_all_required_fields(data, ['username']):
        return jsonify({'error': 'Invalid request, must provide username'}), 400
    
    # Handle user not found
    username = data['username']
    if username not in sessions:
        return jsonify({'error': 'User not logged in or found'}), 401

    
    # Verify session key
    user_submitted_session_key = request.cookies.get('session_key')
    user_session = sessions[username]
    
    session_disabled, valid_session_key = user_session.get_key()
    if user_submitted_session_key != valid_session_key:
        return jsonify({'error': 'Authentication failed'}), 401
    
    # Handle disabled session
    if session_disabled:
        return jsonify({'message': 'Session terminated, please login again.'}), 419
     
    # Fetch available cities
    request_body = {'username':username}
    response = post_request_access_manager('/list_available_cities', request_body)

    # Handle faulty response
    if 'cities' not in response:
        return jsonify({'error': response.text}), response.status

    return jsonify({'cities': response['cities']}), 200
    
@app.route('/get_azure_key_for_city', methods=['POST'])
def get_azure_key_for_city():
    data = request.json

    # Ensure that all fields are present
    if not has_all_required_fields(data, ['username', 'city_name']):
        return jsonify({'error': 'Invalid request, must provide username and city_name'}), 400

    username = data['username']
    city_name = data['city_name']
    user_submit_session_key = request.cookies.get('session_key')

    # Handle user not found
    user_session = sessions.get(username)
    if user_session is None:
        return jsonify({'error': 'User is not logged in'}), 401
    
    # Validate user session
    session_disabled, session_key = user_session.get_key()
    if user_submit_session_key != session_key:
        return jsonify({'error': 'Authentication failed'}), 401

    # Handle disabled key
    if session_disabled:
        return jsonify({'error': 'Session terminated, please login again.'}), 419

    # Handle azure key not found
    azure_key = city_azure_key_dict.get(DEVELOPER) if user_session.has_sword else city_azure_key_dict.get(city_name)
    if azure_key is None:
        return jsonify({'error': 'City does not exist'}), 404

    return jsonify({'azure_key': azure_key})

@app.route('/forgot-password-page')
def forgot_password_page():
    # ping access manager if it has gone to sleep, reduce wait time for user
    threading.Thread(target=post_request_access_manager, args=("/ping", {})).start()

    return render_template('/password-reset/request-password-reset.html')

@app.route('/request_password_reset', methods=['POST'])
def request_password_reset():
    data = request.json
    
    # Ensure that all fields are present
    if not has_all_required_fields(data, ['username']):
        return jsonify({'error': 'Invalid request, must provide username'}), 400
    
    username = data['username']
    data = {"username": username}
    
    # Start a new thread to handle the request in the background
    threading.Thread(target=post_request_access_manager, args=("/request_password_reset", data)).start()
    
    return jsonify({'message': 'If an account with that email exists, you will receive a password reset email shortly.'}), 200

allowed_extensions = {'png'}
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def in_range(value:int, min:float|int, max:float|int):
    return value > floor(min) and value < ceil(max)    

def is_inside_search_space(filename:str, city_name:str):
    _, x, y = filename.split("/")[1].removesuffix(".png").split("_")
    z = int(filename.split("/")[0])
    x = int(x)
    y = int(y)

    # Filter zoom levels
    if not in_range(z, 8, 18):
        return True

    zoom_dif = 18 - z

    # Create scale factor because x and y coords double for each zoom level
    scale_factor = 2 ** zoom_dif

    # Check if x and y is inside range of city given
    top_left, bottom_right = citySearchAreaMap[city_name]
    if in_range(x*scale_factor, top_left[0], bottom_right[0]) and in_range(y*scale_factor, top_left[1], bottom_right[1]):
        return True 
        
    return False

def apply_filters(file_path:str|os.PathLike, disable_residential:bool, disable_garages:bool, disable_commercial:bool) -> io.BytesIO:
    with Image.open(file_path) as image:
        image = image.convert("RGBA")

        # Split the image into individual bands
        red_channel, green_channel, blue_channel, alpha_channel = image.split()

        # Convert channels to Numpy arrays
        red_array = np.array(red_channel)
        green_array = np.array(green_channel)
        blue_array = np.array(blue_channel)
        alpha_array = np.array(alpha_channel)

        # Zero out channels based on filters
        if disable_residential:
            red_array = np.zeros_like(red_array)

        if disable_garages:
            green_array = np.zeros_like(green_array)

        if disable_commercial:
            blue_array = np.zeros_like(blue_array)

        # Modify alpha channel based on the red, green, and blue channels
        mask = (red_array == 0) & (green_array == 0) & (blue_array == 0)
        alpha_array[mask] = 0

        # Convert the NumPy arrays back to PIL images
        red_channel = Image.fromarray(red_array)
        green_channel = Image.fromarray(green_array)
        blue_channel = Image.fromarray(blue_array)
        alpha_channel = Image.fromarray(alpha_array)

        # Create a new image with the red band replaced with zeroes
        new_image = Image.merge("RGBA", (red_channel, green_channel, blue_channel, alpha_channel))

        # Save the modified image to a BytesIO object
        img_io = io.BytesIO()
        new_image.save(img_io, 'PNG')
        img_io.seek(0)

    return img_io

@app.route('/tile/<string:city_name>/<path:filepath>', methods=['GET'])
def tile(city_name:str, filepath:str|os.PathLike):   
    # Handle bad file paths and types
    filename = secure_filename(filepath)
    filename = filename.replace('_', '/', 1)
    if not allowed_file(filename):
        return jsonify({'error': 'Invalid file type'}), 400

    # Handle user not found
    username = request.args.get("username", default="")
    if username not in sessions:
        return jsonify({'error': 'User not logged in or found'}), 401

    # Verify session key
    user_session = sessions[username]
    session_disabled, session_key = user_session.get_key()
    if request.cookies.get('session_key') != session_key:
        return jsonify({'error': 'Authentication failed'}), 401
    
    # Handle disabled session
    if session_disabled:
        return jsonify({'message': 'Session terminated, please login again.'}), 419

    # Ask for authorization of request 
    user_request = ('city', city_name)
    if not user_session.is_allowed_access(user_request):
        return jsonify({'error': 'Unauthorized to access this resource'}), 403
    
    # Check city exists e.g if server had a successful setup
    city_path = os.path.join(PATH_TO_IMAGE_TILES, city_name)
    if not os.path.isdir(city_path):
        print("User authorized to city that does not exist!!")
        return jsonify({'error': 'Unable to find resource'}), 500
    
    # Handle non existent file (outside or inside bounds)
    file_path = os.path.join(city_path, filename)
    if not os.path.exists(file_path):
        if is_inside_search_space(filename, city_name):
            return send_file('blank.png', mimetype='image/png')
        else:
            return send_file('unavailable.png', mimetype='image/png')
        
    # Check for filters
    disable_residential = request.args.get("residential") == "False"
    disable_garages = request.args.get("garages") == "False"
    disable_commercial = request.args.get("commercial") == "False"

    # Apply filters
    if disable_residential or disable_garages or disable_commercial: 
        response_data = apply_filters(file_path, disable_residential, disable_garages, disable_commercial)
    else:
        response_data = file_path

    response = make_response(send_file(response_data, mimetype='image/png'))
    
    response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'

    return response

@app.route('/get_brf', methods=['POST'])
def get_brf():
    # Parse request body
    data = request.json
    if not has_all_required_fields(data, ['username', 'address']):
        return jsonify({'error': 'Invalid request, must provide username and address'}), 400

    address = data['address']
    username = data['username']
    user_submit_session_key = request.cookies.get('session_key')

    print(address)

    # Handle user not found
    user_session = sessions.get(username)
    if user_session is None:
        return jsonify({'error': 'User is not logged in'}), 401
    
    # Validate user session
    session_disabled, session_key = user_session.get_key()
    if user_submit_session_key != session_key:
        return jsonify({'error': 'Authentication failed'}), 401

    # Handle disabled key
    if session_disabled:
        return jsonify({'error': 'Session terminated, please login again.'}), 419

    response = brf_search_engine.find_brf(address)
    if response == None or response['items'] == []:
        response = jsonify({ "items": [ {"name": "Unable to find anything here"} ] })
    print(response)

    return response

@app.route('/')
def index():
    return render_template("index.html")


@app.route('/signup')
def signup():
    username = request.args.get("email")
    token = request.args.get("token")

    user_signup_token_dict.update({username: token})

    return render_template("signup/signup.html", token=token, email=username, redirectpage=SITE_URL)

@app.route('/password-reset')
def password_reset():
    username = request.args.get("email")
    token = request.args.get("token")

    user_signup_token_dict.update({username: token})

    return render_template("password-reset/reset-password.html", token=token, email=username, redirectpage=SITE_URL)


def handle_sigterm(*args):
    print("Received SIGTERM, shutting down gracefully...")
    sys.exit(0)

if __name__ == "__main__":
    signal.signal(signal.SIGTERM, handle_sigterm)
    
    BRFNameFinder.start_new_session()

    if os.environ['FLASK_ENV'] == 'production':
        app.run(app)
    else:
        app.run(app, debug=True)