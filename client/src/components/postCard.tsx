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
	useToast
} from "@chakra-ui/react";
import {AiFillHeart, AiOutlineHeart} from "react-icons/ai";
import {Link} from "react-router-dom";
import ReactMarkdown from "react-markdown";
import ChakraUIRenderer from "chakra-ui-markdown-renderer";
import {useCallback, useState} from "react";

import {makeAPIRequest} from "../utils/apiHandler";
import {PostContentProps, PostProps} from '../utils/typeDefs'

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

type ContentTypeLookupType = {
	[contentType: string]: ({postTitle, postBody}: PostContentProps) => JSX.Element
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
		postLikeCount, userLikeStatus
	} = props

	const [likeCount, setLikeCount] = useState<number>(postLikeCount)

	const [likeStatus, setLikeStatus] = useState<boolean>(userLikeStatus)

	const showToast = useToast()

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

	const PostContentComponent = contentTypeLookup[postType]

	return (
		<Box
			borderRadius={"5px"}
			minWidth={"50vw"}
			maxWidth={"66vw"}
			maxHeight={"50vh"}
			boxShadow={"md"}
			border={"1px"}
			borderColor={"grey.400"}
			padding={"10px"}
		>
			<Text
				fontSize={"xl"}
				margin={"5px"}
			>
				<Text as={'b'}>
					{postTitle}
				</Text>
				<Text
					float={"right"}
					as={'span'}
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
				</Text>
			</Text>
			<Divider
				borderColor={"grey.400"}
			/>
			<Box
				padding={"10px"}
				minWidth={"inherit"}
			>
				<PostContentComponent
					postTitle={postTitle}
					postBody={postBody}
				></PostContentComponent>
			</Box>
			<Flex
				flexDirection={"row"}
			>
				{likeStatus ? (
					<Button
						onClick={toggleLike}
					>
						<AiFillHeart
							color={"hotpink"}
						/>
						&nbsp;
						<Text>
							{likeCount}
						</Text>
					</Button>
				) : (
					<Button
						onClick={toggleLike}
					>
						<AiOutlineHeart
							color={"hotpink"}
						/>
						&nbsp;
						<Text>
							{likeCount}
						</Text>
					</Button>
				)}
			</Flex>
		</Box>
	)

}

export {
	PostCard
}