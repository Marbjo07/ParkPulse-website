from flask import Flask
from flask_cors import CORS
app = Flask(__name__, static_folder="/")
CORS(app) # This will enable CORS for all routes


@app.route('/')
def index():
    return app.send_static_file("src/index.html")