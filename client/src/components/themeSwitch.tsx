import * as React from 'react'

import {useColorMode, IconButton} from '@chakra-ui/react'
import {FaSun, FaMoon} from 'react-icons/fa'
import {Helmet} from "react-helmet-async";

function ThemeSwitch(){
	const {colorMode, toggleColorMode} = useColorMode()

	return (
		<>
			<IconButton
				icon={colorMode == 'light' ? <FaSun /> : <FaMoon />}
				aria-label={"Toggle light/dark mode"}
				onClick={toggleColorMode}
			/>
		</>
	)
}

export {ThemeSwitch}