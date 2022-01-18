# Python Flask API

This example contains a simple Flask API that exposes two endpoints:

- An endpoint that retrieves a GeoJSON for visualization using the Maps API query endpoint

- An endpoint that executes a simple query and return the result using the SQL API query endpoint

The API has been tested with Python 3.9.9. To start the API:

1. Install the required Python packages (we recommend you to use a virtual environment):

   ```shell
   $ pip install -r requirements.txt
   ```

2. Create a .env file with the required configuration. You can see what variables you need to define by looking at the provided .env.example

3. Execute the following command:

   ```shell
   $ python api.py
   ```