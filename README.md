# CARTO 3 Custom App Backend

This repository contains different examples for implementing a custom backend API with the new version of the CARTO platform launched on October 2021.

You might use a custom backend for several reasons, including:

- You are implementing your own authentication/authorization system instead of using the integration with CARTO credentials. This is not recommended because the easiest and fastest way to implement authentication/authorization in your CARTO custom application is to use the integrated authentication with the CARTO platform credentials. The CARTO platform includes Single Sign On (SSO) features so you can even use this integrated authentication with your corporate credentials.

- You want to create a public application (no login required) where you have dynamic SQL queries. For public applications you can use permanent access tokens that grant access to specific datasets or queries from specific connections, but you cannot use these tokens if the queries are dynamic (i.e. they have `WHERE` clause parameters that change depending on user input).

- You want to hide the data organization of your data warehouse so no queries are done directly from the frontend. The CARTO platform is audited and is not vulnerable to SQL injections or similar attacks but you can be unconfortable having SQL queries within your frontend code.

In all these cases you need to take care of creating tokens to provide access to your data warehouse. This is done using the client ID - client secret pair from a machine to machine application created within the Workspace. More info [here](https://api-docs.carto.com).

The examples are very simple and the main goal is to be illustrate how to retrieve and refresh tokens that are then used to make queries to the Maps API or the SQL API endpoints.

## Python

### Flask

This example contains a simple Flask API that exposes two endpoints:

- An endpoint that retrieves a GeoJSON for visualization using the Maps API query endpoint

- An endpoint that executes a simple query and return the result using the SQL API query endpoint

The API has been tested with Python 3.9.9. To start the API, first install the required Python packages (we recommend you to use a virtual environment):

```shell
$ pip install -r requirements.txt
```

And then execute the following command:

```shell
$ python api.py
```