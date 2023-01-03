import * as React from 'react';
import {
	Box,
	Center,
	Divider,
	Image,
	Text,
	Link as ChakraLink,
	Flex,
	Button,
	useToast, Spacer
} from "@chakra-ui/react";
import {AiFillHeart, AiOutlineComment, AiOutlineHeart} from "react-icons/ai";
import {Link, useNavigate} from "react-router-dom";
import ReactMarkdown from "react-markdown";
import ChakraUIRenderer from "chakra-ui-markdown-renderer";
import {useCallback, useEffect, useState} from "react";

import {makeAPIRequest} from "../utils/apiHandler";
import {PostContentProps, PostProps, ContentTypeLookupType} from '../utils/typeDefs'

function TextPostContent({postTitle, postBody}: PostContentProps): JSX.Element {
	return (
		<ReactMarkdown components={ChakraUIRenderer()}>
			{postBody}
		</ReactMarkdown>
	)
}


function ImagePostContent({postTitle, postBody}: PostContentProps): JSX.Element {
	return (
		<Center>
			<Image
				src={postBody}
				alt={postTitle}
				maxHeight={"30vh"}
			>
			</Image>
		</Center>
	)
}

function LinkPostContent({postTitle, postBody}: PostContentProps): JSX.Element {
	const contentURL = new URL(postBody)

	const contentDomain = contentURL.origin
	const displayIconURL = `${contentDomain}/favicon.ico`

	return (
		<Box
			maxWidth={"inherit"}
		>
			<Image
				src={displayIconURL}
				alt={postTitle}
			>
			</Image>
			<ChakraLink
				href={postBody}
			>
				<Text
					color={"blue.400"}
				>
					{postBody}
				</Text>
			</ChakraLink>
		</Box>
	)
}

const contentTypeLookup: ContentTypeLookupType = {
	"TEXT_POST": TextPostContent,
	"IMAGE_POST": ImagePostContent,
	"LINK_POST": LinkPostContent
}

function PostCard(props: PostProps): JSX.Element {
	const {
		postId, postAuthor, postType, postTitle,
		postBody, postModifiedTime, postCommentCount,
		postTags, postEdited, postLikeCount, userLikeStatus
	} = props

	const postModifiedDate = new Date(postModifiedTime)

	const [likeCount, setLikeCount] = useState<number>(postLikeCount)

	const [likeStatus, setLikeStatus] = useState<boolean>(userLikeStatus)

	const showToast = useToast()
	const redirect = useNavigate()

	useEffect(() => {
		setLikeStatus(userLikeStatus)
	}, [userLikeStatus])

	const toggleLike = useCallback(async () => {
		let requestMethod: "POST" | "DELETE" = "POST"
		if (likeStatus === true){
			requestMethod = "DELETE"
		}

		const {isSuccess, isError, code, data, error} = await makeAPIRequest({
			url: `/posts/${postId}/likes`,
			method: requestMethod,
			useAuthentication: true
		})

		if (isSuccess === true && code === 200){
			setLikeCount(
				likeStatus ?
					likeCount - 1 :
					likeCount + 1
			)
			setLikeStatus(!likeStatus)
		} else {
			if (code === 401){
				const {actionResult} = data

				if (actionResult == "ERR_AUTH_REQUIRED"){
					showToast({
						status: "error",
						title: "Login",
						description: "You need to log in to perform this action"
					})
				}
			}

			if (code == 429){
				// Hitting a rate-limit
				showToast({
					status: "warning",
					title: "Rate Limited",
					description: "You are performing actions too fast! Take a break!"
				})
			}
		}
	}, [likeStatus])

	return (
		<Box
			borderRadius={"5px"}
			minWidth={"50vw"}
			maxWidth={"66vw"}
			maxHeight={"50vh"}
			boxShadow={"md"}
			border={"1px"}
			borderColor={"grey.400"}
			paddingX={"1.5rem"}
			paddingY={"0.75rem"}
		>
			<Text
				fontSize={"xl"}
				margin={"5px"}
			>
				<ChakraLink>
					<Text as={'b'}>
						<Link to={`/posts/${postId}/`}>
							{postTitle}
						</Link>
					</Text>
				</ChakraLink>
				<Text
					float={"right"}
					as={'i'}
					fontSize={"sm"}
				>
					<Link
						to={`/users/${postAuthor}`}
					>
						<Text
							as={'u'}
						>
							{postAuthor}
						</Text>
					</Link>
					{" " + postModifiedDate.toLocaleDateString()}
				</Text>
			</Text>
			<Box height={"2vh"} />
			<Flex
				flexDirection={"row"}
				gap={"1"}
			>
				{postTags.map((postTag) => {
					postTag = postTag.replace("#", "")
					return (
						<Button
							padding={"1vh 1vw"}
							borderRadius={"5px"}
							onClick={() => {
								redirect(`/posts/search?searchQuery=${postTag}`)
							}}
						>
							{"#" + postTag}
						</Button>
					)
				})}
			</Flex>
			<Box height={"2vh"} />
			<Flex
				flexDirection={"row"}
				gap={"1"}
				alignItems={"center"}
			>
				{likeStatus ? (
					<>
						<AiFillHeart
							color={"hotpink"}
						/>
						{likeCount}
					</>
				) : (
					<>
						<AiOutlineHeart
						color={"hotpink"}
							/>
						{`${likeCount} ${likeCount == 1 ? "Like" : "Likes"}`}
					</>
				)}
				<Spacer />
				<AiOutlineComment />
				{`${postCommentCount} ${postCommentCount == 1 ? "Comment" : "Comments"}`}
			</Flex>
		</Box>
	)

}

export {
	PostCard
}