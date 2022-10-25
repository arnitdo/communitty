import {Image, useMediaQuery} from "@chakra-ui/react";
import * as React from "react";
import {useNavigate} from "react-router-dom";

function HomeIcon(): JSX.Element {

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
			maxHeight={"2em"}
			onClick={() => {
				redirect("/")
			}}
			cursor={"pointer"}
		/>
	)
}

export {
	HomeIcon
}