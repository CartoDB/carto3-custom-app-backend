import os
import functools

import flask
import jwt
import requests

from dotenv import load_dotenv
from flask_cors import CORS
from flask import jsonify

load_dotenv()

app = flask.Flask(__name__)
app.config['DEBUG'] = os.environ.get('DEBUG')
CORS(app)

token = None

# Gets a new token using the client id - client secret pair from a M2M application
# Reads the client id - client secret pair from environment variables
def get_new_m2m_token():
    post_data = {
      'grant_type': 'client_credentials',
      'client_id': os.environ.get('CLIENT_ID'),
      'client_secret': os.environ.get('CLIENT_SECRET'),
      'audience': 'carto-cloud-native-api'
    }
    r = requests.post('https://auth.carto.com/oauth/token', data=post_data)
    response = r.json()
    return response["access_token"]      

# Decorator to retrieve a new token or update the existing one if needed
def get_m2m_token(func):
    @functools.wraps(func)
    def wrapper_get_m2m_token(*args, **kwargs):
        global token
        if token is None:
            token = get_new_m2m_token()
        else:
            # Check expiration
            try:
                jwt.decode(token, options={"verify_signature": False})
            except jwt.ExpiredSignatureError:
                token = get_new_m2m_token()
        return func(*args, **kwargs)
    return wrapper_get_m2m_token

# Endpoint to get a token
# All the connections available to the user that created
# the M2M application can be used
@app.route('/api/v1/token', methods=['GET'])
@get_m2m_token
def get_token():
    return jsonify({'token': token})

# Endpoint example to return data using the GeoJSON format
@app.route('/api/v1/stores/all', methods=['GET'])
@get_m2m_token
def get_all_stores():
    headers = {'authorization': 'bearer ' + token}

    # First request to get the URL to GeoJSON resource 
    r = requests.get(
      os.environ.get('MAPS_API_BASE_URL') + '/' +
      os.environ.get('CONNECTION_NAME') + '/' +
      'query?q=SELECT * FROM cartobq.public_account.retail_stores',
      headers=headers
    )
    response = r.json()

    # Second request to get the actual GeoJSON data
    r = requests.get(response["geojson"]["url"][0], headers=headers)

    return r.json()

# Endpoint example to return data using the TileJSON format
@app.route('/api/v1/vaccination/all', methods=['GET'])
@get_m2m_token
def get_all_vaccination():
    headers = {'authorization': 'bearer ' + token}

    # First request to get the URL to TileJSON resource 
    r = requests.get(
      os.environ.get('MAPS_API_BASE_URL') + '/' +
      os.environ.get('CONNECTION_NAME') + '/' +
      'tileset?name=carto-demo-data.demo_tilesets.covid19_vaccinated_usa_tileset',
      headers=headers
    )
    response = r.json()

    # Second request to get the actual TileJSON data
    r = requests.get(response["tilejson"]["url"][0], headers=headers)

    return r.json()

# Endpoint example to return data using the SQL API (JSON format)
@app.route('/api/v1/stores/average-revenue', methods=['GET'])
@get_m2m_token
def get_average_revenue():
    headers = {'authorization': 'bearer ' + token}

    r = requests.get(
      os.environ.get('SQL_API_BASE_URL') + '/' +
      os.environ.get('CONNECTION_NAME') + '/' +
      'query?q=SELECT AVG(revenue) AS average_revenue FROM cartobq.public_account.retail_stores',
      headers=headers
    )
    
    return r.json()

app.run()
