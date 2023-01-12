import * as React from 'react'
import {Button, Center, Flex, Text, useMediaQuery, useToast} from '@chakra-ui/react'
import {useCallback, useEffect, useState} from "react";

import {HomeFeedProps, PostProps, UserCardProps} from "../utils/typeDefs"
import {PostCard} from "../components/postCard"
import {UserCard} from "../components/userCard"
import {useAPIRequest} from "../utils/apiHandler";

import {MdOutlineFeed, MdContacts} from 'react-icons/md'

function HomeFeed({authState, refreshAuth}: HomeFeedProps): JSX.Element {
	const [currentFeedPage, setCurrentFeedPage] = useState<number>(1)
	const [currentFallbackPage, setCurrentFallbackPage] = useState<number>(1)
	const [fallbackFlag, setFallbackFlag] = useState<boolean>(false)

	const [postData, setPostData] = useState<PostProps[]>([])
	const [recommendedUsers, setRecommendedUsers] = useState<UserCardProps[]>([])

	const showToast = useToast()

	const [isMobileDevice] = useMediaQuery("(max-width: 1080px)")

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

				const recommendedFeedUsers = data.recommendedUsers as UserCardProps[]

				setRecommendedUsers(recommendedFeedUsers)
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
				maxWidth={"80vw"}
				gap={"4"}
				minWidth={"fit-content"}
			>
				<Flex
					flexDirection={"column"}
					gap={"2"}
					overflowY={"scroll"}
					marginY={"5vh"}
					justifyContent={"flex-start"}
				>
					<>
						{isMobileDevice && recommendedUsers.length > 0 ? (
							<Flex
								flexDirection={"column"}
								marginY={"5vh"}
								gap={"1"}
							>
								<Flex
									alignItems={"center"}
									gap={"4"}
								>
									<Text
										fontSize={"3xl"}
									>
										<MdContacts />
									</Text>
									<Text
										as={'b'}
										fontSize={'3xl'}
									>
										You might know
									</Text>
								</Flex>
								{recommendedUsers.map((recommendedUser) => {
									return (
										<UserCard
											key={recommendedUser.username}
											{...recommendedUser}
										/>
									)
								})}
							</Flex>
						) : null}
						<Flex
							alignItems={"center"}
							gap={"4"}
						>
							<Text
								fontSize={"3xl"}
							>
								<MdOutlineFeed />
							</Text>
							<Text
								as={'b'}
								fontSize={'3xl'}
							>
								Your Feed
							</Text>
						</Flex>
						{
							postData.map((postDataObject) => {
								const {postId} = postDataObject
								return (
									<PostCard
										key={postId}
										{...postDataObject}
									/>
								)
							})
						}
					</>
					<Button variant={"brandPrimary"} onClick={loadMorePosts}>Load More Posts</Button>
				</Flex>
				{isMobileDevice && recommendedUsers.length > 0 ? null : (
					<Flex
						flexDirection={"column"}
						marginY={"5vh"}
						gap={"2"}
						maxWidth={"30vw"}
					>
						<Flex
							alignItems={"center"}
							gap={"4"}
						>
							<Text
								fontSize={"3xl"}
							>
								<MdContacts />
							</Text>
							<Text
								as={'b'}
								fontSize={'3xl'}
							>
								You might know
							</Text>
						</Flex>
						{recommendedUsers.map((recommendedUser) => {
							return (
								<UserCard
									key={recommendedUser.username}
									{...recommendedUser}
								/>
							)
						})}
					</Flex>
				) }
			</Flex>
		</Center>
	)
}

export {HomeFeed}