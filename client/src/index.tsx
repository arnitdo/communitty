import * as React from "react"
import * as ReactDOM from "react-dom/client"
import {App} from "./App"
import {ChakraProvider} from "@chakra-ui/react";
import {QueryClient, QueryClientProvider} from "react-query";

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
				<App />
			</ChakraProvider>
		</QueryClientProvider>
</React.StrictMode>
)