import axios from 'axios';
import cors from 'cors';
import 'dotenv/config'; 
import express from 'express';
import jwksClient from 'jwks-rsa';
import jwt from 'jsonwebtoken';

const app = express();
const port = 3000;

app.use(cors());

let token = null;
let publicKey = null;

// Gets the JWS signing key corresponding to the kid parameter
async function getSigningKey(kid) {
  var client = jwksClient({
    jwksUri: 'https://auth.carto.com/.well-known/jwks.json'
  });
  let signingKey = await client.getSigningKey(kid);
  return(signingKey.publicKey);
}

// Gets a new token using the client id - client secret pair from a M2M application
// Reads the client id - client secret pair from environment variables
async function getNewToken() {
  const postData = {
    'grant_type': 'client_credentials',
    'client_id': process.env.CLIENT_ID,
    'client_secret': process.env.CLIENT_SECRET,
    'audience': 'carto-cloud-native-api'
  };
  const response = await axios.post('https://auth.carto.com/oauth/token', postData);  

  return response.data.access_token;
}

// Returns a new token or an existing token if we already have one and it has not expired
async function getToken() {
  if (token === null) {
    token = await getNewToken();
  }
  else {
    // Check expiration
    if (publicKey === null) {
      var decoded = jwt.decode(token, {complete: true});
      publicKey = await getSigningKey(decoded.header.kid);
    }
    try {
      jwt.verify(token, publicKey);
    } 
    catch(err) {
      if (err.name == 'TokenExpiredError') {
        token = await getNewToken();
      }
    }
  }

  return token;
}

// Middleware to get the token for the headers in CARTO API requests
async function getAuthHeaders(req, res, next) {
  const token = await getToken();
  req.userToken = token;
  next();
}

// Endpoint to get a token
// All the connections available to the user that created
// the M2M application can be used
app.get('/api/v1/token', async (req, res) => {
  const token = await getToken();
  return res.json({'token': token}); 
});

// Endpoint example to return data using the GeoJSON format
// Takes care of authentication/authorization
app.get('/api/v1/stores/all', getAuthHeaders, async (req, res) => {
  const headers = {'authorization': 'bearer ' + req.userToken};

  // First request to get the URL to GeoJSON resource 
  const firstResponse = await axios.get(
    process.env.MAPS_API_BASE_URL + '/' +
    process.env.CONNECTION_NAME + '/' +
    'query?q=SELECT * FROM cartobq.public_account.retail_stores',
    { headers: headers }
  );

  // Second request to get the actual GeoJSON data
  const secondResponse = await axios.get(
    firstResponse.data.geojson.url[0], 
    { 
      headers: headers,
      responseType: 'stream'
    }
  );

  // Set the content type header
  res.set('Content-Type', secondResponse.headers['content-type']);

  // Pipe the response from the Maps API 
  return secondResponse.data.pipe(res);
});

// Endpoint example to return data using the TileJSON format
// Takes care of authentication/authorization
app.get('/api/v1/vaccination/all', getAuthHeaders, async (req, res) => {
  const headers = {'authorization': 'bearer ' + req.userToken};

  // First request to get the URL to TileJSON resource 
  const firstResponse = await axios.get(
    process.env.MAPS_API_BASE_URL + '/' +
    process.env.CONNECTION_NAME + '/' +
    'tileset?name=carto-demo-data.demo_tilesets.covid19_vaccinated_usa_tileset',
    { headers: headers }
  );

  // Second request to get the actual TileJSON data
  const secondResponse = await axios.get(
    firstResponse.data.tilejson.url[0], 
    { 
      headers: headers,
      responseType: 'stream'
    }
  );

  // Set the content type header
  res.set('Content-Type', secondResponse.headers['content-type']);

  // Pipe the response from the Maps API 
  return secondResponse.data.pipe(res);
});

// Endpoint example to return data using the SQL API (JSON format)
// Takes care of authentication/authorization
app.get('/api/v1/stores/average-revenue', getAuthHeaders, async (req, res) => {
  const headers = {'authorization': 'bearer ' + req.userToken};

  const response = await axios.get(
    process.env.SQL_API_BASE_URL + '/' +
    process.env.CONNECTION_NAME + '/' +
    'query?q=SELECT AVG(revenue) AS average_revenue FROM cartobq.public_account.retail_stores',
    { 
      headers: headers,
      responseType: 'stream'
    }
  );

  // Set the content type header
  res.set('Content-Type', response.headers['content-type']);

  // Pipe the response from the SQL API 
  return response.data.pipe(res);
});

app.listen(port, () => {
  console.log(`Custom backend API listening at http://localhost:${port}`)
})
