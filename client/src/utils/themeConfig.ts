import {defineStyle, defineStyleConfig, extendTheme} from "@chakra-ui/react";

const brandPrimary = defineStyle({
	bg: "#4299E1"
})

const brandSecondary = defineStyle({
	borderColor: "#4299E1"
})

const buttonTheme = defineStyleConfig({
	variants: {
		brandPrimary,
		brandSecondary
	}
})

const themeConfig: any = {
	initialColorMode: 'system',
	useSystemColorMode: true,
	components: {
		Button: buttonTheme
	}
}

const globalTheme = extendTheme(themeConfig)

export {
	globalTheme
}