import * as React from 'react'
import {useNavigate} from "react-router-dom";
import {Box, Button, Center, Flex, Image, Input, Spacer, Text, useToast} from "@chakra-ui/react";
import {useCallback, useEffect, useState} from "react";
import {BasicAPIResponse, makeAPIRequest, setLocalStorage} from "../utils/apiHandler";
import {LoginPageProps} from "../utils/typeDefs";

function LoginPage({refreshAuth}: LoginPageProps){
	const redirect = useNavigate()
	const showToast = useToast()

	const [[invalidUsername, invalidPassword], setInvalidUserPass] = useState<[boolean, boolean]>([false, false])

	const [inputUsername, setInputUsername] = useState<string>("")
	const [inputPassword, setInputPassword] = useState<string>("")

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

		if (isError){
			console.error(error)
			showToast({
				status: "error",
				title: "An error occurred",
				description: "An error occured when processing your request"
			})
			return
		}

		if (code === 200){
			// Code 200, irrespective of actionResult is a successful login
			const {authToken, refreshToken} = data
			setLocalStorage({
				"communittyAuthToken": authToken,
				"communittyRefreshToken": refreshToken
			})
			refreshAuth()
			redirect(-1)
		}

		if (code == 400){
			const {actionResult} = data as BasicAPIResponse
			if (actionResult == "ERR_MISSING_BODY_PARAMS"){
				const missingProperties: string[] = data.missingProperties
				if (missingProperties.length === 2){
					setInvalidUserPass([
						true, true
					])
				} else if (missingProperties.indexOf("userName") !== -1){
					setInvalidUserPass([
						true, invalidPassword
					])
				} else if (missingProperties.indexOf("userPass") !== -1){
					setInvalidUserPass([
						invalidUsername, true
					])
				} else {}
			} else if (actionResult === "ERR_INVALID_PROPERTIES"){
				const invalidProperties: string[] = data.invalidProperties
				if (invalidProperties.indexOf("userName") !== -1){
					setInvalidUserPass([
						true, invalidPassword
					])
				}
				if (invalidProperties.indexOf("userPass") !== -1){
					setInvalidUserPass([
						invalidUsername, true
					])
				}
			}
		}
	}, [inputUsername, inputPassword])

	useEffect(() => {
		if (invalidUsername && invalidPassword){
			showToast({
				status: "warning",
				title: "Invalid credentials provided!",
				description: "Username and password are invalid!"
			})
		} else if (invalidUsername && !invalidPassword){
			showToast({
				status: "warning",
				title: "Invalid username provided!",
				description: "Username is invalid!"
			})
		} else if (!invalidUsername && invalidPassword){
			showToast({
				status: "warning",
				title: "Invalid password provided!",
				description: "Password is invalid!"
			})
		} else {}
	}, [invalidUsername, invalidPassword])

	return (
		<Flex
			flexDirection={"column"}
		>
			<Spacer
				minHeight={"20vh"}
			/>
			<Center
				width={"100vw"}
			>
				<Box
					borderRadius={"5px"}
					color={"grey.400"}
					border={"1px"}
					padding={"2%"}
					minWidth={"33vw"}
					maxWidth={"66vw"}
				>
					<Image
						src={`/home-icon.svg`}
						alt={"Communitty"}
						marginX={"5vw"}
					/>
					<Spacer
						height={"5vh"}
					/>
					<Input
						placeholder={"Username"}
						borderColor={
							invalidUsername ?
								"orangered" : "inherit"
						}
						onChange={(e) => {
							e.preventDefault()
							setInvalidUserPass([
								false, invalidPassword
							])
							setInputUsername(e.target.value)
						}}
					/>
					<Spacer
						height={"5vh"}
					/>
					<Input
						type={"password"}
						placeholder={"Password"}
						borderColor={
							invalidPassword ?
								"orangered" : "inherit"
						}
						onChange={(e) => {
							setInvalidUserPass([
								invalidUsername, false
							])
							e.preventDefault()
							setInputPassword(e.target.value)
						}}
					/>
					<Spacer
						height={"5vh"}
					/>
					<Flex
						justifyContent={"space-evenly"}
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
				</Box>
			</Center>
		</Flex>
	)
}

export {
	LoginPage
}