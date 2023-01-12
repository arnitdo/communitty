import * as React from "react"
import {BasicAPIResponse, UserCardProps} from "../utils/typeDefs";
import {Box, Flex, Avatar, Link as ChakraLink, Text, useToast, IconButton, useMediaQuery} from "@chakra-ui/react";
import {SlUserFollow, SlUserFollowing} from "react-icons/sl";
import {Link} from "react-router-dom";
import {useCallback, useState} from "react";
import {makeAPIRequest} from "../utils/apiHandler";

function UserCard(props: UserCardProps){
	const {username, profileName, profileDescription, avatarUrl, followerCount, followingCount} = props

	const [userFollowed, setUserFollowed] = useState<boolean>(false)
	const [showExpandedDescription, setShowExpandedDescription] = useState<boolean>(false)

	const isMobileDevice = useMediaQuery('(max-width: 1080px)')

	const showToast = useToast()

	const attemptUserFollowOrUnfollow = useCallback(async () => {
		const {isSuccess, isError, code, data, error} = await makeAPIRequest({
			url: `/users/${username}/follows`,
			method: userFollowed ? "DELETE" : "POST",
			useAuthentication: true
		})

		if (isError){
			showToast({
				title: "An unexpected error occurred",
				status: "error"
			})

			return
		}

		if (isSuccess){
			const {actionResult} = data as BasicAPIResponse

			if (code === 200 && actionResult === "SUCCESS"){
				setUserFollowed((prevUserFollowed) => {
					return !prevUserFollowed
				})
			} else if (code === 400){
				if (actionResult === "ERR_ALREADY_FOLLOWED"){
					showToast({
						title: `You are already following ${username}`,
						status: "error"
					})
				} else if (actionResult === "ERR_NOT_FOLLOWED"){
					showToast({
						title: `You are not following ${username}`,
						status: "error"
					})
				}
			} else if (code === 401){
					showToast({
						title: "You need to login to follow other users",
						status: "warning"
					})
			} else if (code === 429){
				showToast({
					title: "You are performing actions too fast!",
					description: "Try again after a short while",
					status: "warning"
				})
			}
		}

	}, [userFollowed])

	return (
		<Box
			padding={"4"}
			border={"1px"}
			borderColor={"grey.400"}
			borderRadius={"5px"}
			paddingY={"2vh"}
		>
			<Flex
				gap={"4"}
				alignItems={"center"}
				justifyContent={"space-around"}
			>
				<Avatar
					src={avatarUrl}
					aria-label={`${username}'s avatar`}
					borderRadius={"50%"}
					size={"md"}
				/>
				<Flex
					flexDirection={"column"}
					gap={"2"}
					justifyContent={"space-around"}
					flexGrow={"1"}
				>
					<ChakraLink as={Link} to={`/users/${username}`}>
						<Text
							as={'b'}
							fontSize={"l"}
							textOverflow={"ellipsis"}
							overflow={"hidden"}
							maxWidth={"15vw"}
							noOfLines={1}
						>
							{profileName}
						</Text>
					</ChakraLink>
					<ChakraLink as={Link} to={`/users/${username}`}>
						<Text
							as={"span"}
							textOverflow={"ellipsis"}
							overflow={"hidden"}
							noOfLines={1}
						>
							@{username}
						</Text>
					</ChakraLink>
					<Text
						as={"span"}
						textOverflow={"ellipsis"}
						overflow={"hidden"}
						noOfLines={showExpandedDescription ? -1 : 1}
						onClick={() => {
							setShowExpandedDescription((expandedDescription) => {
								return !expandedDescription
							})
						}}
					>
						{profileDescription}
					</Text>
				</Flex>
				<IconButton
					icon={
						userFollowed ? (
							<SlUserFollowing />
						) : (
							<SlUserFollow/>
						)
					}
					aria-label={
						userFollowed ?
							`Unfollow ${username}` : `Follow ${username}`
					}
					variant={"outline"}
					borderRadius={"50%"}
					border={"1px"}
					borderColor={"grey.400"}
					size={"lg"}
					float={"right"}
					onClick={() => {
						attemptUserFollowOrUnfollow()
					}}
				/>
			</Flex>
		</Box>
	)
}

export {
	UserCard
}