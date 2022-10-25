import * as React from 'react'
import {Helmet} from 'react-helmet-async'
import {BrowserRouter, Route, Routes} from 'react-router-dom'
import {TopBar} from "./components/topbar";
import {useCallback, useState} from "react";
import {HomeFeed} from "./pages/homeFeed";
import {Spacer} from "@chakra-ui/react";
import {LoginPage} from "./pages/loginPage";

function App(): JSX.Element {
	const [showTopBar, setShowTopBar] = useState<boolean>(true)

	const [authState, setAuthState] = useState<number>(0)

	// Basic function to trigger a re-render of auth state based components.
	// Useful when forcing a re-render of
	const refreshAuth = useCallback(() => {
		setAuthState(authState + 1)
	}, [authState])

	return (
		<>
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
						element={<HomeFeed />}
					/>
					<Route
						path={"login"}
						element={<LoginPage
							refreshAuth={() => refreshAuth()}
						/>}
					/>
				</Routes>
			</BrowserRouter>
		</>
	)
}

export {App}