from flask_cors import CORS
from flask import Flask, request, jsonify, render_template

import os
import sys
import json
import signal
import requests

from flask_cors import CORS
from flask import Flask, request, jsonify, send_file, Response

import io
import os
import sys
import json
import time
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
from prometheus_client import Counter, generate_latest
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

app = Flask(__name__, static_folder="src", template_folder='src')
app.config['SECRET_KEY'] = secrets.token_hex(32)  
CORS(app) # This will enable CORS for all routes

if os.environ['FLASK_ENV'] == "development":
    SITE_URL = "http://localhost:5000"
    API_SERVER_URL = "http://localhost:5000"
    ACCESS_MANAGER_URL = 'http://accessmanager:5000'
else:
    SITE_URL = "https://parkpulse-web.azurewebsites.net"
    API_SERVER_URL = "https://parkpulse-web.azurewebsites.net"
    ACCESS_MANAGER_URL = os.environ['ACCESS_MANAGER_URL']

DEVELOPER = 'dev'
PATH_TO_IMAGE_TILES = os.environ['PATH_TO_IMAGE_TILES']

USER_REQUEST_COUNTER = Counter('total_request_per_user', 'Total number of tile requests for each user ', ['user'])
TILE_REQUEST_COUNTER = Counter('tile_requests_total', 'Total number of requests to the endpoint', ['tile'])

city_azure_key_dict:Dict[str, str] = {
    'stockholm': os.environ['AZURE_KEY_STOCKHOLM'],
    'munich': os.environ['AZURE_KEY_MUNICH'],
    DEVELOPER: os.environ['AZURE_KEY_DEV'],
}


citySearchAreaMap:Dict[str, list[Tuple[int, int]]] = {
    'stockholm':  [(144024, 76942), (144239, 77221)],  
    'munich':  [(139376, 90800), (139608, 91056)]    
}

user_signup_token_dict = {}

CORS(app)  # This will enable CORS for all routes

class Session():
    def __init__(self, username, has_sword):
        self.username: str = username
        
        self.session_key:str = secrets.token_hex(32)
        self.disabled:bool = False
        
        self.allowed_requests: Dict[str, list[str]] = {}
        self.denied_requests: Dict[str, list[str]] = {}
        
        self.is_requesting_access = False
        self.has_sword = has_sword

        self.request_log: list[Tuple[str, str]] = []

    def get_key(self) -> Tuple[bool, str]:
        return self.disabled, self.session_key
    
    def disable_session(self):
        self.disabled = True
        self.session_key = None
        self.allowed_requests = None 
        self.denied_requests = None

    def save_request_results(self, request, request_authorized):
        data_type, data_id = request

        request_list = self.allowed_requests if request_authorized else self.denied_requests

        if data_type not in request_list:
            request_list[data_type] = []

        request_list[data_type].append(data_id)

    def is_allowed_access(self, request:Tuple[str, str]) -> bool:
        if self.disabled:
            return False
        
        data_type, data_id = request

        # check if previously denied access
        if data_type in self.denied_requests and data_id in self.denied_requests[data_type]:
            return False

        # check if request previously was authorized
        if data_type in self.allowed_requests:
            is_allowed = data_id in self.allowed_requests[data_type]
            if is_allowed:
                self.request_log.append(request)
                return True
        
        if self.is_requesting_access:
            while self.is_requesting_access:
                time.sleep(1)
            return self.is_allowed_access(request)


        self.is_requesting_access = True

        # ask accessmanager for authorization
        request_authorized = authorize_request(self.username, request)
        self.save_request_results(request, request_authorized)

        self.is_requesting_access = False


        if request_authorized:
            self.request_log.append(request)
            
        return request_authorized
    
def post_request_access_manager(endpoint:str, request_body:dict[str, any]) -> any:
    assert endpoint.startswith('/')

    data = json.loads(json.dumps(request_body))
    response = requests.post(url=f'{ACCESS_MANAGER_URL}{endpoint}', json=data)
    response = response.json()
    return response

def authorize_request(username:str, request:Tuple[str, str]) -> bool:
    request_body = {'username':username, 'request':request}
    response = post_request_access_manager('/authorize_request', request_body)
    if not response['authorized']:
        return False
    
    return response['authorized']
        
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
        
        disabled, key = new_session.get_key()
        assert disabled == False, "New session is invalid?"

        return jsonify({'key': key}), 200   
    else:
        return jsonify({'message': 'Authentication failed'}), 401

@app.route('/complete_user_setup', methods=["POST"])
def complete_user_setup():
    
    data = request.json

    if 'username' not in data or 'password_hash' not in data:
        return jsonify({'error', 'Invalid request, must provide token, username and password_hash'}), 400
    
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

    if not has_all_required_fields(data, ['username', 'session_key']):
        return jsonify({'error': 'Invalid request, must provide username'}), 400
    

    # Handle user not found
    username = data['username']
    if username not in sessions:
        return jsonify({'error': 'User not logged in or found'}), 401

    
    # Verify session key
    user_submitted_session_key = data['session_key']
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
    if not has_all_required_fields(data, ['username', 'city_name', 'session_key']):
        return jsonify({'error': 'Invalid request, must provide username, city_name and session_key'}), 400

    username = data['username']
    city_name = data['city_name']
    user_submit_session_key = data['session_key']

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
        return jsonify({'error': 'Session terminated, please login again.'}), 401

    # Handle azure key not found
    azure_key = city_azure_key_dict.get(DEVELOPER) if user_session.has_sword else city_azure_key_dict.get(city_name)
    if azure_key is None:
        return jsonify({'error': 'City does not exist'}), 404

    return jsonify({'azure_key': azure_key})

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


allowed_extensions = {'png', 'jpg', 'jpeg'}
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

@app.route('/metrics')
def metrics():
    return Response(generate_latest(), mimetype='text/plain')

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
    if request.args.get('session_key', default="") != session_key:
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
        
    USER_REQUEST_COUNTER.labels(user=username).inc()
    TILE_REQUEST_COUNTER.labels(tile=filename).inc()
    
    # Check for filters
    disable_residential = request.args.get("residential") == "False"
    disable_garages = request.args.get("garages") == "False"
    disable_commercial = request.args.get("commercial") == "False"

    # Apply filters
    if disable_residential or disable_garages or disable_commercial: 
        img_io = apply_filters(file_path, disable_residential, disable_garages, disable_commercial)
        return send_file(img_io, mimetype='image/png')
    
    return send_file(file_path, mimetype='image/png')


@app.route('/get_phone_number', methods=['GET'])
def get_phone_number():
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # Ensure GUI is off
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    
    address = request.args.get("address")
    address = "toppklockegränd 16573 hässelby"

    print(address)

    return address

@app.route('/')
def index():
    return render_template("index.html", api_server_url=API_SERVER_URL)


@app.route('/signup')
def signup():
    username = request.args.get("email")
    token = request.args.get("token")

    user_signup_token_dict.update({username: token})

    return render_template("signup/signup.html", token=token, email=username, site_url=SITE_URL, redirectpage=SITE_URL)




def handle_sigterm(*args):
    print("Received SIGTERM, shutting down gracefully...")
    sys.exit(0)

if __name__ == "__main__":
    signal.signal(signal.SIGTERM, handle_sigterm)
    if os.environ['FLASK_ENV'] == 'production':
        app.run(app)
    else:
        app.run(app, debug=True)
