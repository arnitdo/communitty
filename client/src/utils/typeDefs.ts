import React from "react";
import {IconType} from "react-icons";

export type PostContentType = "TEXT_POST" | "LINK_POST" | "IMAGE_POST"

export type APIResponse = {
	isSuccess: boolean,
	isError: boolean,
	code: number,
	data?: BasicAPIResponse,
	error?: Error
}

export type APIResponseState = [
	/* isLoading */ boolean,
	/* isSuccess */ boolean,
	/* isError */ boolean,
	/* code */ number | null,
	/* data */ BasicAPIResponse | null,
	/* error */ Error | null
]

// Type spaghetti just to get some sensible tsc hints during compilation
// Make sure to update this when API handlers are updated
export type ActionResult = "SUCCESS"							// Success
	| "ERR_NOT_FOUND"											// 404 Not Found
	| "ERR_INVALID_TOKEN" | "ERR_AUTH_REQUIRED"					// No auth / invalid auth
	| "ERR_AUTH_EXPIRED" | "REFRESH_EXPIRED"					// Auth / Refresh token expired
	| "ERR_INSUFFICIENT_PERMS"									// Not owner of content
	| "ERR_RATE_LIMITED"										// Ratelimited
	| "ERR_MISSING_BODY_PARAMS" | "ERR_MISSING_URL_PARAMS"		// Missing parameters
	| "ERR_INVALID_PROPERTIES"									// Invalid request
	| "ERR_DUPLICATE_PROPERTIES"								// Duplicate values
	| `ERR_${"NOT" | "ALREADY"}_${"LIKED" | "FOLLOWED"}`		// Already/Not following / liked content
	| `ERR_SELF_${"UN" | ""}FOLLOW`								// Self follow / unfollow
	| "ERR_INTERNAL_ERROR"										// Internal error

export type BasicAPIResponse = {
	actionResult: ActionResult
} & any

export type APIRequestParams = {
	url: string,
	method?: "GET" | "POST" | "PUT" | "DELETE",
	useAuthentication?: boolean
	bodyParams?: object,
	queryParams?: object
}

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

export type HomeIconType = {
	maxHeight?: string
}