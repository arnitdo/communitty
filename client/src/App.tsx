import * as React from 'react'
import Helmet from 'react-helmet'
import {BrowserRouter, Route, Routes} from 'react-router-dom'
import {TopBar} from "./components/topbar";

function App(): JSX.Element {
	return (
		<>
			{/*Metadata*/}
			<Helmet>
				<title>Welcome to Communitty!</title>
				<meta name={"description"}
					  content={"Welcome to Communitty, an open source social media application!"}></meta>
				<meta name={"keywords"} content={"communitty,open source,community,social media"}></meta>
			</Helmet>

			{/*Routing*/}
			<BrowserRouter>
				<TopBar/>
				<Routes>
					<Route path={"/"}></Route>
				</Routes>
			</BrowserRouter>
		</>
	)
}

export {App}