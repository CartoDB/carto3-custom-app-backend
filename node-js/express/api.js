import axios from "axios";
import 'dotenv/config'; 
import express from 'express';
import jwksClient from 'jwks-rsa';
import jwt from 'jsonwebtoken';

const app = express();
const port = 3000;

let token = null;
token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImRVNGNZTHAwaThjYnVMNkd0LTE0diJ9.eyJodHRwOi8vYXBwLmNhcnRvLmNvbS9lbWFpbCI6ImVybmVzdG8rcHVibGljQGNhcnRvLmNvbSIsImh0dHA6Ly9hcHAuY2FydG8uY29tL2FjY291bnRfaWQiOiJhY19scWUzendndSIsImlzcyI6Imh0dHBzOi8vYXV0aC5jYXJ0by5jb20vIiwic3ViIjoiYXV0aDB8NjBlNDgzMTRhZTdiODgwMDcxOWQ2MWJlIiwiYXVkIjpbImNhcnRvLWNsb3VkLW5hdGl2ZS1hcGkiLCJodHRwczovL2NhcnRvLXByb2R1Y3Rpb24udXMuYXV0aDAuY29tL3VzZXJpbmZvIl0sImlhdCI6MTY0MDEwODAwMSwiZXhwIjoxNjQwMTk0NDAxLCJhenAiOiJqQ1duSEs2RTJLMmFPeTlqTHkzTzdaTXBocUdPOUJQTCIsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwgcmVhZDpjdXJyZW50X3VzZXIgdXBkYXRlOmN1cnJlbnRfdXNlciByZWFkOmNvbm5lY3Rpb25zIHdyaXRlOmNvbm5lY3Rpb25zIHJlYWQ6bWFwcyB3cml0ZTptYXBzIHJlYWQ6YWNjb3VudCBhZG1pbjphY2NvdW50IiwicGVybWlzc2lvbnMiOlsiYWRtaW46YWNjb3VudCIsInJlYWQ6YWNjb3VudCIsInJlYWQ6YXBwcyIsInJlYWQ6Y29ubmVjdGlvbnMiLCJyZWFkOmN1cnJlbnRfdXNlciIsInJlYWQ6aW1wb3J0cyIsInJlYWQ6bGlzdGVkX2FwcHMiLCJyZWFkOm1hcHMiLCJyZWFkOnRpbGVzZXRzIiwicmVhZDp0b2tlbnMiLCJ1cGRhdGU6Y3VycmVudF91c2VyIiwid3JpdGU6YXBwcyIsIndyaXRlOmNvbm5lY3Rpb25zIiwid3JpdGU6aW1wb3J0cyIsIndyaXRlOmxpc3RlZF9hcHBzIiwid3JpdGU6bWFwcyIsIndyaXRlOnRva2VucyJdfQ.cJhC1xyub8QcXb3PBSKp4vVirsnK-wIL7g_PHwYulIsBnUW3XZePqcLM157N0h--aGLySfSvOAN-_wSOkUb-F-zblBl1iqqor3UnV2-6itqPO_Og29f5SUuiq1doZpWO0961bf81h8AXwA1w-69gKEap_XxnTL5ZUQ7mOpnMb7tQw4mD5HZSHG6NM5F6izqyQLqEzgeCya0wwz7jpRRwtoVPPv7Ysu_xfJNHZK1JpGjfoxW_jlMQwUWzbfoLkMdC1Jn6Cs7GxginKmk2w0-wKq-_JFN9KO9dUVEy5c-0BT8aJG5WURLDfQq4otcDz6LmcdfhGP0jy9P27r9WeMspDw';

// Make signingKey global to avoid making an additional URL request each time

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

async function getKey(header, callback){
  var client = jwksClient({
    jwksUri: 'https://auth.carto.com/.well-known/jwks.json'
  });
  await client.getSigningKey(header.kid, function(err, key) {
    var signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

async function getToken() {
  return token;
  if (token === null) {
    token = await getNewToken();
  }
  else {
    // Check expiration
    jwt.verify(token, getKey, { algorithms: ['RS256'] }, async function (err, decoded) {
      if (err) {
        if (err.name == 'TokenExpiredError') {
          token = await getNewToken();
        }
      }
    });
  }
  
  return token;
}

async function getAuthHeaders(req, res, next) {
  const token = await getToken();
  req.userToken = token;
  next();
}

app.get('/api/v1/stores/all', getAuthHeaders, async (req, res) => {
  //await getToken();
  const headers = {'authorization': 'bearer ' + req.userToken};

  // First request to get the URL to GeoJSON resource 
  const firstResponse = await axios.get(
    process.env.MAPS_API_BASE_URL + '/' +
    process.env.CONNECTION_NAME + '/' +
    'query?q=SELECT * FROM cartobq.public_account.retail_stores',
    { headers: headers }
  ).catch(function (error) {
    if (error.response.data.message == "jwt expired" && error.response.data.status == 401) {
        
      //console.log(error.response.data);
    }
  });

  // Second request to get the actual GeoJSON data
  const secondResponse = await axios.get(firstResponse.data.geojson.url[0], { headers: headers })

  return res.send(secondResponse.data); // Pipe-streamin
});

app.get('/api/v1/stores/average-revenue', getAuthHeaders, async (req, res) => {
  //token = await getToken();
  const headers = {'authorization': 'bearer ' + req.userToken};

  const response = await axios.get(
    process.env.SQL_API_BASE_URL + '/' +
    process.env.CONNECTION_NAME + '/' +
    'query?q=SELECT AVG(revenue) AS average_revenue FROM cartobq.public_account.retail_stores',
    { headers: headers }
  );

  return res.send(response.data);
});

app.listen(port, () => {
  console.log(`Custom backend API listening at http://localhost:${port}`)
})
