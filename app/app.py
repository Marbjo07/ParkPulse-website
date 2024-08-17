from flask_cors import CORS
from flask import Flask, request, jsonify, render_template

import os
import sys
import json
import signal
import requests


app = Flask(__name__, static_folder="src", template_folder='src')
CORS(app) # This will enable CORS for all routes

if os.environ['FLASK_ENV'] == "development":
    print("app running in debug")

    SITE_URL = "http://localhost:5000"
    API_SERVER_URL = "http://localhost:5001"
else:
    SITE_URL = "https://parkpulse-web.azurewebsites.net"
    API_SERVER_URL = "https://parkpulse-api.azurewebsites.net"

user_signup_token_dict = {}

@app.route('/')
def index():
    return render_template("index.html", api_server_url=API_SERVER_URL)


@app.route('/signup')
def signup():
    username = request.args.get("email")
    token = request.args.get("token")

    user_signup_token_dict.update({username: token})

    return render_template("signup/signup.html", token=token, email=username, site_url=SITE_URL, redirectpage=SITE_URL)


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

    response = requests.post(url=f'{SITE_URL}/finish_onboarding', json=data)


def handle_sigterm(*args):
    print("Received SIGTERM, shutting down gracefully...")
    sys.exit(0)

if __name__ == "__main__":
    signal.signal(signal.SIGTERM, handle_sigterm)
    if os.environ['FLASK_ENV'] == 'production':
        app.run(app)
    else:
        app.run(app, debug=True)
