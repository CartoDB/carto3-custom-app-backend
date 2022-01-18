import logging
import os

import flask
import jwt
import requests

from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()

app = flask.Flask(__name__)
app.config['DEBUG'] = os.environ.get('DEBUG')
CORS(app)

token = None

def get_new_token():
    post_data = {
      'grant_type': 'client_credentials',
      'client_id': os.environ.get('CLIENT_ID'),
      'client_secret': os.environ.get('CLIENT_SECRET'),
      'audience': 'carto-cloud-native-api'
    }
    r = requests.post('https://auth.carto.com/oauth/token', data=post_data)
    response = r.json()
    return response["access_token"]      

def get_token():
    global token
    if token is None:
        token = get_new_token()
    else:
        # Check expiration
        try:
            jwt.decode(token, options={"verify_signature": False})
        except jwt.ExpiredSignatureError:
            token = get_new_token()
    return token
        
@app.route('/api/v1/stores/all', methods=['GET'])
def get_all_stores():
    token = get_token()
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

@app.route('/api/v1/stores/average-revenue', methods=['GET'])
def get_average_revenue():
    token = get_token()
    headers = {'authorization': 'bearer ' + token}

    r = requests.get(
      os.environ.get('SQL_API_BASE_URL') + '/' +
      os.environ.get('CONNECTION_NAME') + '/' +
      'query?q=SELECT AVG(revenue) AS average_revenue FROM cartobq.public_account.retail_stores',
      headers=headers
    )
    
    return r.json()

app.run()
