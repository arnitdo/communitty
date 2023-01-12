import * as React from 'react'
import {Helmet} from 'react-helmet-async'
import {BrowserRouter, Route, Routes} from 'react-router-dom'
import {TopBar} from "./components/topbar";
import {useCallback, useEffect, useState} from "react";
import {HomeFeed} from "./pages/homeFeed";
import {Box, useColorMode, useToast} from "@chakra-ui/react";
import {LoginPage} from "./pages/loginPage";
import {ProfileContext} from "./utils/profileContext";
import {ProfileContextType} from "./utils/typeDefs";
import {useAPIRequest} from "./utils/apiHandler";
import {SignupPage} from "./pages/signupPage";

function App(): JSX.Element {
	const [showTopBar, setShowTopBar] = useState<boolean>(true)

	const [authState, setAuthState] = useState<number>(0)

	const [profileValue, setProfileValue] = useState<ProfileContextType | null>(null)
	
	const [isLoading, isSuccess, isError, code, data, error] = useAPIRequest({
		url: "/users/me",
		useAuthentication: true
	}, [authState])

	const showToast = useToast()

	useEffect(() => {
		if (isSuccess && !isLoading){
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

	useEffect(() => {
		if (profileValue && profileValue.accountActivated === false){
			showToast({
				status: "warning",
				isClosable: true,
				title: "Account activation is incomplete",
				description: "Follow the steps in the activation mail sent to your account"
			})
		}
	}, [profileValue])

	// Basic function to trigger a re-render of auth state based components.
	// Useful when forcing a re-render of auth based components
	const refreshAuth = useCallback(() => {
		setAuthState(authState + 1)
	}, [authState])

	const {colorMode} = useColorMode()

	return (
		<Box
			minWidth={"fit-content"}
		>
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
					<link rel={"icon"} href={`favicon-${colorMode}.ico`} />
				</Helmet>

				{/*Routing*/}
				<BrowserRouter>
					{showTopBar ? (
						<>
							<TopBar
								authState={authState}
								refreshAuth={() => refreshAuth()}
							/>
						</>
					) : null}
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
						<Route
							path={"signup"}
							element={<SignupPage
								setShowTopBar={setShowTopBar}
							/>}
						/>
					</Routes>
				</BrowserRouter>
			</ProfileContext.Provider>
		</Box>
	)
}

export {App}