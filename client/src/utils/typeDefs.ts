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

export interface PostContentProps {
	postTitle: string,
	postBody: string
}

export type ContentTypeLookupType = {
	[contentType: string]: ({postTitle, postBody}: PostContentProps) => JSX.Element
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
