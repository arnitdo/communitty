import React, {useCallback, useEffect, useState} from "react";
import {HomeIcon} from "../components/homeIcon";
import {TopBarControlComponent} from "../utils/typeDefs";
import {makeAPIRequest} from "../utils/apiHandler";
import {BasicAPIResponse, ActionResult} from "../utils/typeDefs";
import {Box, Button, Center, Flex, Input, Text, useToast} from "@chakra-ui/react";

import {AiOutlineMail, AiOutlineUser, AiOutlineLock, AiOutlineIdcard} from "react-icons/ai";
import {useNavigate} from "react-router-dom";

function SignupPage({setShowTopBar}: TopBarControlComponent){
	const [userMail, setUserMail] = useState<string>("")
	const [userName, setUserName] = useState<string>("")
	const [userPass, setUserPass] = useState<string>("")
	const [fullName, setFullName] = useState<string>("")

	const [[duplicateUserMail, duplicateUserName], setDuplicateProperties] = useState<boolean[]>([false, false])

	const [
		[invalidUserMail, invalidUserName, invalidUserPass, invalidFullName],
		setInvalidProperties
	] = useState<boolean[]>([false, false, false, false])

	const [signupSuccess, setSignupSuccess] = useState<boolean>(false)
	const [showPassword, setShowPassword] = useState<boolean>(false)

	const redirect = useNavigate()
	const showToast = useToast()

	const attemptSignup = useCallback(async () => {
		setInvalidProperties([false, false, false, false])
		setDuplicateProperties([false, false])

		const {isSuccess, isError, code, data, error} = await makeAPIRequest({
			url: '/auth/signup',
			method: "POST",
			useAuthentication: false,
			bodyParams: {
				userMail, userName, userPass, fullName
			}
		})

		if (isError){
			showToast({
				title: "An unexpected error occurred",
				status: "error"
			})

			return
		}

		if (isSuccess){
			const actionResult: ActionResult = (data as BasicAPIResponse).actionResult

			if (actionResult === "ERR_DUPLICATE_PROPERTIES"){
				const duplicateProperties: string[] = data.duplicateProperties

				const propertyNames = ["userMail", "userName"]
				const propertyTarget: boolean[] = []

				for (const propertyName of propertyNames) {
					if (duplicateProperties.includes(propertyName)){
						propertyTarget.push(true)
					} else {
						propertyTarget.push(false)
					}
				}

				setDuplicateProperties(propertyTarget)
			} else if (actionResult === "ERR_INVALID_PROPERTIES" || actionResult === "ERR_MISSING_BODY_PARAMS"){
				const invalidOrMissingProperties: string[] = [
					...(data.invalidProperties || []),
					...(data.missingProperties || [])
				]

				const propertyNames: string[] = ["userMail", "userName", "userPass", "fullName"]

				const propertiesTarget: boolean[] = []

				for (const propertyName of propertyNames){
					if (invalidOrMissingProperties.includes(propertyName)){
						propertiesTarget.push(true)
					} else {
						propertiesTarget.push(false)
					}
				}

				setInvalidProperties(propertiesTarget)
			} else if (actionResult === "SUCCESS"){
				setSignupSuccess(true)
			}
		}
	}, [userMail, userName, userPass, fullName])

	useEffect(() => {
		setShowTopBar(false)

		return () => {setShowTopBar(true)}
	}, [])

	useEffect(() => {
		const invalidProperties: string[] = [];
		if (invalidUserMail){
			invalidProperties.push("Email")
		}
		if (invalidUserName){
			invalidProperties.push("Username")
		}
		if (invalidUserPass){
			invalidProperties.push("Weak  Password")
		}
		if (invalidFullName){
			invalidProperties.push("Display Name")
		}

		if (invalidProperties.length === 0){
			return
		}

		if (invalidProperties.length === 1){
			showToast({
				title: `Invalid ${invalidProperties[0]} provided`
			})
		} else {
			const joinedInvalidPropString = invalidProperties.reduce((prev, current, currentIndex) => {
				if (currentIndex != invalidProperties.length - 1){
					return `${prev}, ${current}`
				} else {
					return `${prev} and ${current}`
				}
			})
			showToast({
				description: `Invalid ${joinedInvalidPropString} provided`
			})
		}
	}, [invalidUserMail, invalidUserName, invalidUserPass, invalidFullName])

	useEffect(() => {
		if (duplicateUserName && duplicateUserMail){
			showToast({
				title: "User already exists",
				description: "A user with the same credentials already exists. Try logging in"
			})
		}
		if (duplicateUserMail && !duplicateUserName){
			showToast({
				title: "Email in use",
				description: "That email is already registered. Make sure to activate your account if it is yours"
			})
		}
		if (!duplicateUserMail && duplicateUserName){
			showToast({
				title: "Username is taken",
				description: "That username is taken, try a different one"
			})
		}
	}, [duplicateUserMail, duplicateUserName])

	return (
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
					flexDirection={"column"}
					gap={"2rem"}
					justifyContent={"space-evenly"}
					alignItems={"center"}
				>
					{signupSuccess ? (
						<>
							<Text
								fontSize={"2xl"}
								as={'b'}
							>
								You've signed up successfully! To activate your account, follow the steps sent to your registered email address
							</Text>
							<Button
								variant={"brandPrimary"}
								onClick={() => {
									redirect('/')
								}}
							>
								Back to Home
							</Button>
						</>
					) : (
						<>
							<HomeIcon maxHeight={"3rem"} />
							<Flex
								alignItems={"center"}
								gap={"1rem"}
							>
								<Text fontSize={"2xl"}>
									<AiOutlineMail />
								</Text>
								<Input
									type={"email"}
									onChange={(e) => {
										setUserMail(e.target.value)
									}}
									placeholder={"Email"}
									borderColor={
										invalidUserMail || duplicateUserMail ?
											"orangered" : "inherit"
									}
								/>
							</Flex>
							<Flex
								alignItems={"center"}
								gap={"1rem"}
							>
								<Text fontSize={"2xl"}>
									<AiOutlineUser />
								</Text>
								<Input
									type={"text"}
									onChange={(e) => {
										setUserName(e.target.value)
									}}
									placeholder={"Username"}
									borderColor={
										invalidUserName || duplicateUserName ?
											"orangered" : "inherit"
									}
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
									onChange={(e) => {
										setUserPass(e.target.value)
									}}
									onMouseOver={(e) => {
										setShowPassword(true)
									}}
									onMouseOut={(e) => {
										setShowPassword(false)
									}}
									placeholder={"Password"}
									borderColor={
										invalidUserPass ?
											"orangered" : "inherit"
									}
								/>
							</Flex>
							<Flex
								alignItems={"center"}
								gap={"1rem"}
							>
								<Text fontSize={"2xl"}>
									<AiOutlineIdcard/>
								</Text>
								<Input
									type={"text"}
									onChange={(e) => {
										setFullName(e.target.value)
									}}
									placeholder={"Display name"}
									borderColor={
										invalidFullName ?
											"orangered" : "inherit"
									}
								/>
							</Flex>
							<Flex
								gap={"1rem"}
							>
								<Button
									variant={"brandPrimary"}
									onClick={() => attemptSignup()}
								>
									Sign Up
								</Button>
								<Button
									variant={"outline"}
									onClick={() => {
										redirect('/login')
									}}
								>
									Log In
								</Button>
							</Flex>
						</>
					)}
				</Flex>
			</Box>
		</Center>
	)
}

export {
	SignupPage
}