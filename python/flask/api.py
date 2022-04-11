import os

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

# Returns a new token or an existing token if we already have one and it has not expired
def get_m2m_token():
    global token
    if token is None:
        token = get_new_m2m_token()
    else:
        # Check expiration
        try:
            jwt.decode(token, options={"verify_signature": False})
        except jwt.ExpiredSignatureError:
            token = get_new_m2m_token()
    return token

# Endpoint to get a token
# All the connections available to the user that created
# the M2M application can be used
@app.route('/api/v1/token', methods=['GET'])
def get_token():
    token = get_m2m_token()  # Decorators
    return jsonify({'token': token})

# Endpoint example to return data using the GeoJSON format
# Takes care of authentication/authorization
@app.route('/api/v1/stores/all', methods=['GET'])
def get_all_stores():
    token = get_m2m_token()  # Decorators
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
# Takes care of authentication/authorization
@app.route('/api/v1/railroads/all', methods=['GET'])
def get_all_railroads():
    token = get_m2m_token()  # Decorators
    headers = {'authorization': 'bearer ' + token}

    # First request to get the URL to TileJSON resource 
    r = requests.get(
      os.environ.get('MAPS_API_BASE_URL') + '/' +
      os.environ.get('CONNECTION_NAME') + '/' +
      'table?name=cartobq.public_account.ne_10m_railroads_public',
      headers=headers
    )
    response = r.json()

    # Second request to get the actual TileJSON data
    r = requests.get(response["tilejson"]["url"][0], headers=headers)

    return r.json()

# Endpoint example to return data using the SQL API (JSON format)
# Takes care of authentication/authorization
@app.route('/api/v1/stores/average-revenue', methods=['GET'])
def get_average_revenue():
    token = get_m2m_token()
    headers = {'authorization': 'bearer ' + token}

    r = requests.get(
      os.environ.get('SQL_API_BASE_URL') + '/' +
      os.environ.get('CONNECTION_NAME') + '/' +
      'query?q=SELECT AVG(revenue) AS average_revenue FROM cartobq.public_account.retail_stores',
      headers=headers
    )
    
    return r.json()

app.run()
