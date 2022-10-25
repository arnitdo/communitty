export interface AuthComponent {
	refreshAuth: () => void
}

export interface TopBarProps extends AuthComponent {
	authState: number,
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