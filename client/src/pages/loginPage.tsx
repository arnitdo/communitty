import * as React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {useNavigate} from "react-router-dom";
import {Box, Button, Center, Flex, Input, Text, useToast} from "@chakra-ui/react";
import {Helmet} from 'react-helmet-async'

import {makeAPIRequest, setLocalStorage} from "../utils/apiHandler";
import {TopBarControlComponent, BasicAPIResponse, LoginPageProps} from "../utils/typeDefs";
import {HomeIcon} from "../components/homeIcon";
import {AiOutlineUser, AiOutlineLock} from "react-icons/ai";

function LoginPage({refreshAuth, setShowTopBar}: LoginPageProps & TopBarControlComponent){
	const redirect = useNavigate()
	const showToast = useToast()

	const [[invalidUsername, invalidPassword], setInvalidUserPass] = useState<[boolean, boolean]>([false, false])

	const [inputUsername, setInputUsername] = useState<string>("")
	const [inputPassword, setInputPassword] = useState<string>("")

	useEffect(() => {
		setShowTopBar(false)

		return () => {
			setShowTopBar(true)
		}
	}, [])

	const attemptLogin = useCallback(async () => {
		const {isSuccess, isError, code, data, error} = await makeAPIRequest({
			url: "/auth/login",
			method: "POST",
			useAuthentication: false,
			bodyParams: {
				userName: inputUsername,
				userPass: inputPassword
			}
		})

		if (isError) {
			console.error(error)
			showToast({
				status: "error",
				title: "An error occurred",
				description: "An error occured when processing your request"
			})
			return
		}

		if (code === 200) {
			// Code 200, irrespective of actionResult is a successful login
			const {authToken, refreshToken} = data
			setLocalStorage({
				"communittyAuthToken": authToken,
				"communittyRefreshToken": refreshToken
			})
			refreshAuth()
			redirect('/')
		}

		if (code == 400) {
			const {actionResult} = data as BasicAPIResponse
			if (actionResult == "ERR_MISSING_BODY_PARAMS") {
				const missingProperties: string[] = data.missingProperties
				if (missingProperties.length === 2) {
					setInvalidUserPass([
						true, true
					])
				} else if (missingProperties.indexOf("userName") !== -1) {
					setInvalidUserPass([
						true, invalidPassword
					])
				} else if (missingProperties.indexOf("userPass") !== -1) {
					setInvalidUserPass([
						invalidUsername, true
					])
				} else {
				}
			} else if (actionResult === "ERR_INVALID_PROPERTIES") {
				const invalidProperties: string[] = data.invalidProperties
				if (invalidProperties.indexOf("userName") !== -1) {
					setInvalidUserPass([
						true, invalidPassword
					])
				}
				if (invalidProperties.indexOf("userPass") !== -1) {
					setInvalidUserPass([
						invalidUsername, true
					])
				}
			}
		}
	}, [inputUsername, inputPassword])

	useEffect(() => {
		if (invalidUsername && invalidPassword) {
			showToast({
				status: "warning",
				title: "Invalid credentials provided!",
				description: "Username and password are invalid!"
			})
		} else if (invalidUsername && !invalidPassword) {
			showToast({
				status: "warning",
				title: "Invalid username provided!",
				description: "Username is invalid!"
			})
		} else if (!invalidUsername && invalidPassword) {
			showToast({
				status: "warning",
				title: "Invalid password provided!",
				description: "Password is invalid!"
			})
		} else {
		}
	}, [invalidUsername, invalidPassword])

	const [showPassword, setShowPassword] = useState<boolean>(false)

	return (
		<>
			<Helmet>
				<title>Communitty - Login</title>
				<meta name={"description"} content={"Log in to Communitty"}/>
				<meta name={"keywords"} content={"communitty, login, log in"}/>
			</Helmet>
			<Center
				width={"100vw"}
				height={"100vh"}
			>
				<Box
					borderRadius={"5px"}
					color={"grey.400"}
					border={"1px"}
					padding={"4rem"}
				>
					<Flex
						gap={"2rem"}
						flexDirection={"column"}
						justifyContent={"space-evenly"}
						alignItems={"center"}
					>
						<HomeIcon maxHeight={"3em"}/>
						<Flex
							alignItems={"center"}
							gap={"1rem"}
						>
							<Text fontSize={"2xl"}>
								<AiOutlineUser />
							</Text>
							<Input
								placeholder={"Username"}
								borderColor={
									invalidUsername ?
										"orangered" : "inherit"
								}
								onChange={(e) => {
									setInvalidUserPass([
										false, invalidPassword
									])
									setInputUsername(e.target.value)
								}}
							/>
						</Flex>
						<Flex
							alignItems={"center"}
							gap={"1rem"}
						>
							<Text fontSize={"2xl"}>
								<AiOutlineLock />
							</Text>
							<Input
								type={showPassword ? "text" : "password"}
								placeholder={"Password"}
								borderColor={
									invalidPassword ?
										"orangered" : "inherit"
								}
								onChange={(e) => {
									setInvalidUserPass([
										invalidUsername, false
									])
									setInputPassword(e.target.value)
								}}
								onMouseOver={(e) => {
									setShowPassword(true)
								}}

								onMouseOut={(e) => {
									setShowPassword(false)
								}}
							/>
						</Flex>
						<Flex
							justifyContent={"space-evenly"}
							gap={"2"}
						>
							<Button
								variant={"brandPrimary"}
								onClick={() => {
									attemptLogin()
								}}
							>
								Log In
							</Button>
							<Button
								variant={"outline"}
								onClick={() => {
									redirect('/signup')
								}}
							>
								Sign Up
							</Button>
							<Button
								colorScheme={"red"}
								onClick={() => {
									}}
							>
								Forgot Password
							</Button>
						</Flex>
					</Flex>
				</Box>
			</Center>
		</>
	)
}

export {
	LoginPage
}