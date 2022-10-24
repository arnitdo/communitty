import * as React from 'react';
import {Box, Center, Divider, Image, Text, Link as ChakraLink, Flex, IconButton, useToast} from "@chakra-ui/react";
import {FaHeart, FaHeartBroken} from "react-icons/fa";
import {Link} from "react-router-dom";
import ReactMarkdown from "react-markdown";
import ChakraUIRenderer from "chakra-ui-markdown-renderer";
import {useCallback, useState} from "react";
import {makeAPIRequest, useAPIRequest} from "../utils/apiHandler";

export interface PostProps {
	postId: number,
	postAuthor: string,
	postType: string,
	postTitle: string,
	postBody: string,
	postTags: string[],
	postModifiedTime: string,
	postLikeCount: number,
	postCommentCount: number,
	postEdited: boolean,
	userLikeStatus: boolean
}

interface PostContentProps {
	postTitle: string,
	postBody: string
}

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
				{postBody}
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
			borderColor={"whiteAlpha.400"}
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
					float={"inline-end"}
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
			<Divider />
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
					<IconButton
						aria-label={"Dislike"}
						icon={<FaHeartBroken />}
						onClick={toggleLike}
					/>
				) : (
					<IconButton
						aria-label={"Like"}
						icon={<FaHeart />}
						onClick={toggleLike}
					/>
				)}
			</Flex>
		</Box>
	)

}

export {
	PostCard
}