import {Image, ImageProps, useMediaQuery} from "@chakra-ui/react";
import * as React from "react";
import {useNavigate} from "react-router-dom";
import {HomeIconType} from '../utils/typeDefs'

function HomeIcon({maxHeight}: HomeIconType): JSX.Element {

	const redirect = useNavigate()

	const [isMobileDevice] = useMediaQuery("(max-width: 1080px)")

	return (
		<Image
			src={
				isMobileDevice ?
					`/home-icon-cropped.svg`
					: `/home-icon.svg`
			}
			alt={"Communitty"}
			aria-label={"Click to return to the homepage"}
			onClick={() => {
				redirect("/")
			}}
			maxHeight={maxHeight || "2em"}
			cursor={"pointer"}
		/>
	)
}

export {
	HomeIcon
}