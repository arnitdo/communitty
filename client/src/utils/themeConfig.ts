import {extendTheme, ThemeConfig} from "@chakra-ui/react";

const themeConfig: ThemeConfig = {
	initialColorMode: 'system',
	useSystemColorMode: true
}

const globalTheme = extendTheme(themeConfig)

export {
	globalTheme
}