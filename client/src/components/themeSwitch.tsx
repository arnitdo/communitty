import * as React from 'react'

import {useColorMode, IconButton} from '@chakra-ui/react'
import {FaSun, FaMoon} from 'react-icons/fa'
import {Helmet} from "react-helmet";

function ThemeSwitch(){
	const {colorMode, toggleColorMode} = useColorMode()

	return (
		<>
			<Helmet>
				<link rel={"icon"} href={`favicon-${colorMode}.ico`} />
			</Helmet>
			<IconButton
				icon={colorMode == 'light' ? <FaSun /> : <FaMoon />}
				aria-label={"Toggle light/dark mode"}
				onClick={toggleColorMode}
			/>
		</>
	)
}

export {ThemeSwitch}