import React from "react";
import {IconType} from "react-icons";

export type PostContentType = "TEXT_POST" | "LINK_POST" | "IMAGE_POST"

export interface TopBarControlComponent {
	setShowTopBar: (newState: (((prevState: boolean) => boolean) | boolean)) => void
}

export interface AuthComponent {
	refreshAuth: () => void
}

export interface TopBarProps extends AuthComponent {
	authState: number,
}

export interface HomeFeedProps extends AuthComponent {
	authState: number
}

export interface LoginPageProps extends AuthComponent {

}

export interface PostProps {
	postId: number,
	postAuthor: string,
	postType: PostContentType,
	postTitle: string,
	postBody: string,
	postTags: string[],
	postModifiedTime: string,
	postLikeCount: number,
	postCommentCount: number,
	postEdited: boolean,
	userLikeStatus: boolean
}
export type PostContentIconLookupType = {
	[ContentType in PostContentType]: IconType
}

export type ProfileContextType = {
	username: string,
	profileName: string,
	profileDescription: string,
	avatarUrl: string,
	accountActivated: boolean,
	followerCount: number,
	followingCount: number,
	followingUser: boolean,
	followedByUser: boolean,
	userProfile: string,
	userPosts: string,
	userComments: string,
	userFollowers: string,
	userFollowing: string
}
