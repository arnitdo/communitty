export interface AuthComponent {
	refreshAuth: () => void
}

export interface TopBarProps extends AuthComponent {
	authState: number,
}

export interface LoginPageProps extends AuthComponent {

}