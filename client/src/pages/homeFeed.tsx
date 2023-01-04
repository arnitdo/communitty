import * as React from 'react'
import {Button, Center, Flex, useToast} from '@chakra-ui/react'
import {useCallback, useEffect, useState} from "react";

import {HomeFeedProps, PostProps} from "../utils/typeDefs"
import {PostCard} from "../components/postCard"
import {useAPIRequest} from "../utils/apiHandler";

function HomeFeed({authState, refreshAuth}: HomeFeedProps): JSX.Element {
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
	}, [authState, currentFeedPage, currentFallbackPage])

	useEffect(() => {
		setPostData([])
	}, [authState])

	useEffect(() => {
		if (isSuccess && !isLoading){
			if (code === 200 && data.actionResult == "SUCCESS"){
				const {feedData, feedFallback} = data
				const newPostData = feedData as PostProps[]


				const existingPostData = [...postData]

				if (newPostData.length == 0){
					showToast({
						status: "info",
						isClosable: true,
						title: "No more posts to display",
						description: "You've scrolled too far, take some rest"
					})
				}

				const newPostIds = newPostData.map((post) => {
					return post.postId
				})

				const filteredPostData = existingPostData.filter((existingPost) => {
					const existingPostId = existingPost.postId

					if (newPostIds.indexOf(existingPostId) !== -1){
						return false
					}

					return true
				})

				const finalPostData = [
					...filteredPostData,
					...newPostData
				]

				setPostData(finalPostData)

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
	}, [authState, isLoading])

	const loadMorePosts = useCallback((e: any) => {
		if (fallbackFlag){
			setCurrentFallbackPage(currentFallbackPage + 1)
		} else {
			setCurrentFeedPage(currentFeedPage  + 1)
		}
	}, [currentFeedPage, currentFallbackPage])

	return (
		<Center width={"100vw"}>
			<Flex
				flexDirection={"column"}
				gap={"1vh"}
				overflowY={"scroll"}
				marginBottom={"10vh"}
			>
				<>
					{
						postData.map((postDataObject) => {
							const {postId} = postDataObject
						return (<PostCard key={postId} {...postDataObject}/>)
						})
					}
				</>
				<Button variant={"brandPrimary"} onClick={loadMorePosts}>Load More Posts</Button>
			</Flex>
		</Center>
	)
}

export {HomeFeed}