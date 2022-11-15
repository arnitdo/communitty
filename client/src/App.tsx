import * as React from 'react'
import {Helmet} from 'react-helmet-async'
import {BrowserRouter, Route, Routes} from 'react-router-dom'
import {TopBar} from "./components/topbar";
import {useCallback, useEffect, useState} from "react";
import {HomeFeed} from "./pages/homeFeed";
import {Spacer} from "@chakra-ui/react";
import {LoginPage} from "./pages/loginPage";
import {ProfileContext} from "./utils/profileContext";
import {ProfileContextType} from "./utils/typeDefs";
import {useAPIRequest} from "./utils/apiHandler";

function App(): JSX.Element {
	const [showTopBar, setShowTopBar] = useState<boolean>(true)

	const [authState, setAuthState] = useState<number>(0)

	const [profileValue, setProfileValue] = useState<ProfileContextType | null>(null)
	
	const [isLoading, isSuccess, isError, code, data, error] = useAPIRequest({
		url: "/users/me",
		useAuthentication: true
	}, [authState])

	useEffect(() => {
		if (isSuccess){
			if (code === 200){
				const {actionResult, profileData} = data
				if (actionResult === "SUCCESS") {
					setProfileValue(profileData)
				}
			} else {
				setProfileValue(null)
			}
		}
	}, [authState, isLoading])
	// Basic function to trigger a re-render of auth state based components.
	// Useful when forcing a re-render of auth based components
	const refreshAuth = useCallback(() => {
		setAuthState(authState + 1)
	}, [authState])

	return (
		<ProfileContext.Provider value={profileValue}>
			{/*Metadata*/}
			<Helmet>
				<title>Welcome to Communitty!</title>
				<meta
					name={"description"}
					content={"Welcome to Communitty, an open source social media application!"}
				></meta>
				<meta
					name={"keywords"}
					content={"communitty,open source,community,social media"}
				></meta>
			</Helmet>

			{/*Routing*/}
			<BrowserRouter>
				{showTopBar ? (
					<TopBar
						authState={authState}
						refreshAuth={() => refreshAuth()}
					/>
				) : null}
				<Spacer height={"2vh"} />
				<Routes>
					<Route
						path={"/"}
						element={
							<HomeFeed
								authState={authState}
								refreshAuth={() => refreshAuth()}
							/>
						}
					/>
					<Route
						path={"login"}
						element={<LoginPage
							refreshAuth={() => refreshAuth()}
							setShowTopBar={setShowTopBar}
						/>}
					/>
				</Routes>
			</BrowserRouter>
		</ProfileContext.Provider>
	)
}

export {App}