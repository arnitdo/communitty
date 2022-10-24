import * as React from "react"
import * as ReactDOM from "react-dom/client"
import {App} from "./App"
import {ChakraProvider, ColorModeScript} from "@chakra-ui/react";
import {globalTheme} from "./utils/themeConfig";
import {HelmetProvider} from "react-helmet-async";


const container = document.getElementById("root")
if (!container){
	throw new Error('Failed to find the root element');
}
const root = ReactDOM.createRoot(container)

root.render(
	<React.StrictMode>
		<HelmetProvider>
			<ChakraProvider>
				<ColorModeScript initialColorMode={globalTheme.config.initialColorMode} />
				<App />
			</ChakraProvider>
		</HelmetProvider>
	</React.StrictMode>
)