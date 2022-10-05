import * as React from "react"
import * as ReactDOM from "react-dom/client"
import {App} from "./App"
import {ChakraProvider, ColorModeScript} from "@chakra-ui/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {globalTheme} from "./utils/themeConfig";

const queryClient = new QueryClient()

const container = document.getElementById("root")
if (!container){
	throw new Error('Failed to find the root element');
}
const root = ReactDOM.createRoot(container)

root.render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<ChakraProvider>
				<ColorModeScript initialColorMode={globalTheme.config.initialColorMode} />
				<App />
			</ChakraProvider>
		</QueryClientProvider>
	</React.StrictMode>
)