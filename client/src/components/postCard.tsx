import * as React from 'react';
import {
	Box,
	Text,
	Link as ChakraLink,
	Flex,
	Button,
	useToast, Spacer, Avatar
} from "@chakra-ui/react";
import {
	AiFillHeart,
	AiOutlineComment,
	AiOutlineFileImage,
	AiOutlineAlignLeft,
	AiOutlineHeart,
	AiOutlineLink
} from "react-icons/ai";
import {Link, useNavigate} from "react-router-dom";
import {useCallback, useEffect, useState} from "react";

import {API_URL, makeAPIRequest} from "../utils/apiHandler";
import {PostProps, PostContentIconLookupType} from '../utils/typeDefs'

const postContentIcons: PostContentIconLookupType = {
	"TEXT_POST": AiOutlineAlignLeft,
	"IMAGE_POST": AiOutlineFileImage,
	"LINK_POST": AiOutlineLink
}

function PostCard(props: PostProps): JSX.Element {
	const {
		postId, postAuthor, postType, postTitle,
		postBody, postModifiedTime, postCommentCount,
		postTags, postEdited, postLikeCount, userLikeStatus
	} = props

	const postModifiedDate = new Date(postModifiedTime)

	const redirect = useNavigate()

	const PostContentIcon = postContentIcons[postType]


	return (
		<Box
			borderRadius={"5px"}
			minWidth={"50vw"}
			maxHeight={"50vh"}
			border={"1px"}
			borderColor={"grey.400"}
			paddingX={"1.5rem"}
			paddingY={"1.5rem"}
		>
			<Flex gap={"4"}>
				<Flex
					flexDirection={"column"}
					alignItems={"center"}
					justifyContent={"center"}
				>
					<Text fontSize={"5xl"}>
						<PostContentIcon aria-label={postType.replace("_", " ")}/>
					</Text>
				</Flex>
				<Flex
					flexDirection={"column"}
					gap={"2"}
					justifyContent={"center"}
				>
					<Text>
						<ChakraLink as={Link} to={`/posts/${postId}/`}>
							<Text as={'b'} fontSize={"xl"}>
								{postTitle}
							</Text>
						</ChakraLink>
					</Text>
					<Text>
						<ChakraLink as={Link} to={`/users/${postAuthor}/`}>
							<Text as={"span"} fontSize={"sm"}>
								<Avatar
									src={
										API_URL(`/users/${postAuthor}/avatar`)
									}
									size={"xs"}
									aria-label={`${postAuthor}'s avatar`}
								/>
								&nbsp;
								{`@${postAuthor}`}
							</Text>
						</ChakraLink>
					</Text>
					<Flex gap={"1"}>
						{postTags.map((postTag) => {
							return (
								<Button
									size={"sm"}
									onClick={() => {
										redirect(`/posts/search?searchQuery=${postTag}`)
									}}
									key={`${postId}.${postTag}`}
								>
									{`#${postTag}`}
								</Button>
							)
						})}
					</Flex>
				</Flex>
				<Spacer/>
				<Flex
					flexDirection={"column"}
					gap={"2"}
					justifyContent={"center"}
				>
					<Text>
						{postModifiedDate.toLocaleDateString()}
					</Text>
					<Flex gap={"1"} alignItems={"baseline"}>
						{userLikeStatus ? (
							<>
								<AiFillHeart/>
								{`${postLikeCount} ${postLikeCount === 1 ? "Like" : "Likes"}`}
							</>
						) : (
							<>
								<AiOutlineHeart/>
								{`${postLikeCount} ${postLikeCount === 1 ? "Like" : "Likes"}`}
							</>
						)}
					</Flex>
					<Flex gap={"1"} alignItems={"baseline"}>
						<AiOutlineComment />
						{`${postCommentCount} ${postCommentCount === 1 ? "Comment" : "Comments"}`}
					</Flex>
				</Flex>
			</Flex>
		</Box>
	)
}

export {
	PostCard
}