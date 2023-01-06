import {DependencyList, useCallback, useEffect, useState} from "react";
import {BasicAPIResponse, ActionResult, APIResponseState, APIResponse, APIRequestParams} from "./typeDefs";

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

function setLocalStorage(storageObject: object): void {
	for (const [storageKey, storageValue] of Object.entries(storageObject)){
		localStorage.setItem(
			storageKey,
			storageValue.toString()
		)
	}
}

function resetLocalStorage(): void {
	localStorage.setItem("communittyAuthToken", "null")
	localStorage.setItem("communittyRefreshToken", "null")
}

/*
	Comment on `developmentAPIURL`:
		In a dev environment, `npm run dev`, the client will have hot-reload enabled on port 3000 (by React)
		Thus, the client on `http://localhost:3000/` will make requests to `http://localhost:3000/api/...` routes, which aren't valid
		Since the backend is actually served on port 8800

	Comment on `productionAPIURL`:
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

async function makeAPIRequest(requestProperties: APIRequestParams): Promise<APIResponse> {
	const {url, method, useAuthentication, bodyParams, queryParams} = requestProperties

	const baseHostname: string =
		process.env.NODE_ENV === "development" ?
			"https://localhost:8800/"		:
			"https://communitty.onrender.com"

	const resolvedURL = new URL(
		API_URL(url),
		baseHostname
	)

	if (queryParams != null){
		for (const [queryKey, queryValue] of Object.entries(queryParams)){
			resolvedURL.searchParams.set(queryKey, queryValue)
		}
	}

	let requestOptions: RequestInit = {
		method: method || "GET"
	}

	if (useAuthentication === true){
		const localAuthToken = localStorage.getItem("communittyAuthToken") || "null"
		/* CRITICAL CHECK DO NOT REMOVE */
		if (localAuthToken !== "null"){
			requestOptions.headers = {
				"Authorization": `Bearer ${localAuthToken}`
			}
		} else {
			// TODO: Remove in prod
			console.error(
				`Authenticated request to ${url} was made with auth token null`
			)
		}
	}

	if (requestOptions.method != "GET"){
		// Set the Content-Type header. This enables express's json middleware parser to read incoming request bodies
		requestOptions.headers = {
			...requestOptions.headers as object,	// Cast as object to allow unpacking
			"Content-Type": "application/json; charset=utf-8"
		}
		if (bodyParams != undefined) {
			requestOptions.body = JSON.stringify(bodyParams)
		}
	}

	// Make the actual request -
	try {
		const initialResponse = await fetch(
			resolvedURL,
			requestOptions
		)

		const responseCode = initialResponse.status

		const responseBody: BasicAPIResponse = await initialResponse.json() as BasicAPIResponse

		const {actionResult} = responseBody

		switch (actionResult as ActionResult){
			case "ERR_AUTH_EXPIRED":
				const refreshToken = localStorage.getItem("communittyRefreshToken") || "null"
				const refreshResponse = await makeAPIRequest({
					url: "/auth/token_refresh",
					method: "POST",
					useAuthentication: false,
					bodyParams: {
						"refreshToken": refreshToken
					}
				})

				if (refreshResponse.isSuccess && refreshResponse.code === 200){
					// Token refresh was successful
					// refreshing tokens can have only two possible status 200s -
					// 		SUCCESS: Will be handled by `default` label in this switch case
					// 		REFRESH_EXPIRED: Will be handled first, below.
					// If token refresh fails, authToken will be set to null
					// The recursive call to re-make the request will handle a null auth token accordingly
					// This is written with the *trust* that the handler will check for null tokens

					const refreshData: BasicAPIResponse = refreshResponse.data as BasicAPIResponse
					const refreshedAuthToken = refreshData["authToken"]
					const refreshedRefreshToken = refreshData["refreshToken"]

					setLocalStorage({
						"communittyAuthToken": refreshedAuthToken,
						"communittyRefreshToken": refreshedRefreshToken
					})

					return makeAPIRequest(requestProperties)
				} else {
					resetLocalStorage()
				}

				// Re-make this request with renewed or deleted tokens
				return await makeAPIRequest(requestProperties)

			case "REFRESH_EXPIRED":
				// Auth+Refresh tokens are expired
				resetLocalStorage()

				return await makeAPIRequest(requestProperties)

			case "ERR_NOT_FOUND":
				return {
					isSuccess: false,
					isError: true,
					code: 404,
					data: null,
					error: new Error("ERR_NOT_FOUND")
				}

			default:
				return {
					isSuccess: true,
					isError: false,
					code: responseCode,
					data: responseBody
				}
		}
	} catch (err: any){
		console.error(err)
		return {
			isSuccess: false,
			isError: true,
			code: 0,
			data: null,
			error: err as Error
		}
	}
}

function useAPIRequest(requestProperties: APIRequestParams, deps: DependencyList = []): APIResponseState {
	const [isLoading, setIsLoading] = useState<boolean>(true)
	const [isSuccess, setIsSuccess] = useState<boolean>(false)
	const [isError, setIsError] = useState<boolean>(false)
	const [code, setCode] = useState<number | null>(null)
	const [data, setData] = useState<BasicAPIResponse | null>(null)
	const [error, setError] = useState<Error | null>(null)

	const makeRequest = useCallback(async () => {
		setIsLoading(true)
		setIsSuccess(false)
		setIsError(false)
		setCode(0)
		setData(null)
		setError(null)

		const response = await makeAPIRequest(requestProperties)
		setIsLoading(false)

		/* Set state properties */
		setIsSuccess(response.isSuccess)
		setIsError(response.isError)
		setCode(response.code)
		setData(response.data)
		setError(response.error ?? null)
	}, [requestProperties])

	useEffect(() => {
		makeRequest()
	}, deps)

	return [isLoading, isSuccess, isError, code, data, error]
}

export {
	API_URL,
	makeAPIRequest,
	useAPIRequest,
	setLocalStorage,
	resetLocalStorage
};
