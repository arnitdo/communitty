import {useState, useEffect} from 'react'
import {useLocalStorage} from "./localStorage";
import {useQuery} from "@tanstack/react-query";

function developmentAPIURL(urlPath: string): string{
	// For development environments, route API calls to local express server
	// Running on localhost:8800
	// See communitty/server.ts for port information
	return "http://localhost:8800/api" + urlPath;
}

function productionAPIURL(urlPath: string): string{
	// For production environments, route API calls to actual API handler routes
	// TODO: Implement REST API Routes and update API path accordingly
	// API Path will most likely be /api/<path>.
	// Client will be directly served on /<path>-like routes.
	// All API calls will be routed to /api/<path> routes
	// As of now, return base path
	return `/api/${urlPath}`;
}


/*
	You might be wondering why this file even exists, or why API_URL couldn't be a direct route as-is

	Justification on `developmentAPIURL`:
		In a dev environment, `npm run dev`, the client will have hot reload enabled on port 3000 (by React)
		Thus, the client on `http://localhost:3000/` will make requests to `http://localhost:3000/api/...` routes, which aren't valid
		Since the backend is actually served on port 8800

	Justification on `productionAPIURL`:
		In a production environment, the client bundle will be served on basically all routes
		There won't be separate development ports for the server and client
		Hence, all calls to API routes will be handled on the same port as the client
 */
let API_URL: (urlPath: string) => string;
if (process.env.NODE_ENV === "development"){
	API_URL = developmentAPIURL
} else {
	API_URL = productionAPIURL
}

type APIRequestParams = {
	url: string,
	method?: "GET" | "POST" | "PUT" | "DELETE",
	useAuthentication?: boolean
	bodyParams?: any,
	queryParams?: any
}

function useAPIRequest({url, method = "GET", useAuthentication = false, bodyParams = null, queryParams = null}: APIRequestParams){
	const [authToken, setAuthToken] = useLocalStorage("communittyAuthToken")
	const [refreshToken, setRefreshToken] = useLocalStorage("communittyRefreshToken")

	const baseUrl = new URL(API_URL(url), "https://communitty.onrender.com") // Resolve to prod

	if (queryParams != null){
		for (const [queryKey, queryValue] of queryParams.entries()){
			baseUrl.searchParams.set(queryKey, queryValue.toString())
		}
	}

	let initOptions: RequestInit = {
		method: method as string,
	}

	if (useAuthentication == true){
		initOptions.headers = {
			"Authorization": `Bearer ${authToken}`
		}
	}

	if (method != "GET" && bodyParams != null){
		initOptions.body = JSON.stringify(bodyParams)
	}

	const makeRequest = async function (){
		const fetchedResponse = await fetch(baseUrl, initOptions)
		const responseCode = fetchedResponse.status
		const responseData = await fetchedResponse.json()
		return [responseCode, responseData]
	}

	const requestResponse = useQuery([url, bodyParams, queryParams], makeRequest)
	console.log(requestResponse)

	return requestResponse
}

export {
	API_URL,
	useAPIRequest
};