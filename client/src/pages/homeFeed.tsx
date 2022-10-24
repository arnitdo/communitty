import * as React from 'react'
import {Center, Flex, useToast} from '@chakra-ui/react'
import {PostCard, PostProps} from "../components/postCard";
import {useEffect, useState} from "react";
import {useAPIRequest} from "../utils/apiHandler";

function HomeFeed(): JSX.Element {
	const [currentFeedPage, setCurrentFeedPage] = useState<number>(1)
	const [currentFallbackPage, setCurrentFallbackPage] = useState<number>(1)
	const [fallbackFlag, setFallbackFlag] = useState<boolean>(false)

	const [postData, setPostData] = useState<PostProps[]>([])

	const showToast = useToast()

	const [isLoading, isSuccess, isError, code, data, error] = useAPIRequest({
		url: `/feed`,
		method: "GET",
		useAuthentication: true,
		queryParams: {
			"feedPage": currentFeedPage,
			"fallbackPage": currentFallbackPage
		}
	})

	useEffect(() => {
		if (isSuccess){
			if (code === 200 && data.actionResult == "SUCCESS"){
				const {feedData, feedFallback} = data
				const newPostData = feedData as PostProps[]
				setPostData([
					...postData,
					...newPostData
				])

				if (feedFallback === true){
					if (fallbackFlag === false){
						showToast({
							status: "info",
							title: "Showing posts from other users",
							isClosable: true
						})
					}
					setFallbackFlag(true)
				}
			}
		}
	}, [isLoading])

	return (
		<Center width={"100vw"}>
			<Flex
				flexDirection={"column"}
				gap={"1vh"}
				overflowY={"scroll"}
			>
				{
					isSuccess ? (
						<>
						{
							postData.map((postDataObject) => {
								const {postId} = postDataObject
								return (<PostCard key={postId} {...postDataObject}/>)
							})
						}
						</>
					) : (
						<></>
					)
				}
			</Flex>
		</Center>
	)
}

export {HomeFeed}