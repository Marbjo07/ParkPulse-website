from flask import Flask, request, jsonify, render_template
import json
import requests
from flask_cors import CORS
app = Flask(__name__, static_folder="src", template_folder='src')
CORS(app) # This will enable CORS for all routes

if app.debug:
    print("app running in debug")
    API_SERVER_LOCATION = "http://127.0.0.1:5000"
    WEB_SITE_LOCATION = "http://127.0.0.1:5500"
else:
    API_SERVER_LOCATION = "https://parkpulse-api.azurewebsites.net"
    WEB_SITE_LOCATION = "https://parkpulse-web.azurewebsites.net"

user_signup_token_dict = {}

@app.route('/')
def index():
    return app.send_static_file("index.html")


@app.route('/signup')
def signup():
    username = request.args.get("email")
    token = request.args.get("token")

    user_signup_token_dict.update({username: token})

    return render_template("signup/signup.html", token=token, email=username, serverlocation=API_SERVER_LOCATION, redirectpage=WEB_SITE_LOCATION)


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

    response = requests.post(url=f'{API_SERVER_LOCATION}/finish_onboarding', json=data)
