import * as React from "react";
import * as ReactDOMClient from "react-dom/client";
import Helmet from "react-helmet";

function App(): JSX.Element {
	return (
		<div className={"app"}>
			<Helmet>
				<title>Communitty</title>
				<meta
					name="description"
					content="Engage with others on Communitty"
				/>
				<meta
					name="keywords"
					content="communitty, community, social media"
				/>
			</Helmet>
			Welcome to communitty! This site is still under development, so check back after a while.
		</div>
	)
}

// @ts-ignore
const container = ReactDOMClient.createRoot(document.getElementById("root"));
container.render(<App />)