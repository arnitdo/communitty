# Communitty
#### An open-source social media app created with ExpressJS and ReactJS.

[![Build](https://github.com/arnitdo/communitty/actions/workflows/build_test.yml/badge.svg?branch=dev)](https://github.com/arnitdo/communitty/actions/workflows/build_test.yml)

## For users : 

You might've stumbled upon this repository searching for the actual website. [Click here to be whisked away!](https://communitty.onrender.com). If you are a developer, look below!

## For developers :

The production version of the app should be deployed from the `main` branch [here](https://communitty.onrender.com). For developer builds, take a look into the `dev` branch. Please create all pull requests to the `dev` branch.

### Prerequisites:
- PostgreSQL (latest preferred, v14 for production parity)
- NodeJS (v16 for production parity)

Set up the following environment variables -
 - `DATABASE_URL`: The [pg](https://node-postgres.com/) compatible postgres database URL
 - `JWT_SECRET`  : The encryption secret for JWTs. Use any random set of characters
 - `SENDGRID_API_KEY`: The Twilio SendGrid API key. This is required to send activation emails. You may skip it for development purposes

Next, run the following command to install all necessary dependencies for development & build the client -

    npm run build-dev

To run a live development build (frontend+backend hot reload using nodemon), use

    npm run dev 

It will initialize the server, and client, and hot reload whenever any changes are made to either files. The app should be visible on port `8800`. If a port is specified using environment variables, use that port.
The hot-reloaded client will be on `http://localhost:3000` (Default React Port)
The server will be accessible on `http://localhost:8800`

The server does send built client files, but they are those generated from a static build
Hence, the build command should be run only when deploying.
For development, use the above commands only