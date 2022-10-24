import * as React from 'react'
import {Helmet} from 'react-helmet-async'
import {BrowserRouter, Route, Routes} from 'react-router-dom'
import {TopBar} from "./components/topbar";
import {useState} from "react";
import {HomeFeed} from "./pages/homeFeed";
import {Spacer} from "@chakra-ui/react";

function App(): JSX.Element {
	const [showTopBar, setShowTopBar] = useState<boolean>(true)

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
					<TopBar/>
				) : null}
				<Spacer height={"2vh"} />
				<Routes>
					<Route path={"/"} element={<HomeFeed />}></Route>
				</Routes>
			</BrowserRouter>
		</>
	)
}

export {App}