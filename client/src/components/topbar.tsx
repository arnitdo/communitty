import * as React from 'react'
import {useEffect, useState} from 'react'
import {FaSearch, FaSpinner, FaHome} from "react-icons/fa";
import {Avatar, Box, Button, Flex, IconButton, Image, Input, Spacer, Text} from "@chakra-ui/react";
import {useNavigate} from "react-router-dom";

import {resetLocalStorage, useAPIRequest} from "../utils/apiHandler";
import {ThemeSwitch} from "./themeSwitch";
import {HomeIcon} from "./homeIcon";
import {TopBarProps} from "../utils/typeDefs";

function TopBar({authState, refreshAuth}: TopBarProps): JSX.Element {

	const redirect = useNavigate()

	const [isLoading, isSuccess, isError, code, data, error] = useAPIRequest({
		url: "/users/me",
		useAuthentication: true
	}, [authState])

	const [searchTerm, setSearchTerm] = useState<string | null>(null)

	const [profileData, setProfileData] = useState<any>(null)

	useEffect(() => {
		if (isSuccess){
			if (code === 200){
				const {actionResult, profileData} = data
				if (actionResult === "SUCCESS") {
					setProfileData(profileData)
				}
			} else {
				setProfileData(null)
			}
		}
	}, [isLoading, isSuccess])

	return (
		<Box
			boxShadow={"md"}
			padding={"10px"}
			opacity={"100%"}
		>
			<Flex
				gap={"0.5vw"}
				alignItems={"center"}
			>
				<Spacer maxWidth={"0.5vw"} />
				<HomeIcon />
				<Spacer />
				<Flex
					minWidth={"33vw"}
					maxWidth={"50wv"}
				>
					<Input
						placeholder={"Search posts"}
						borderBottomRightRadius={0}
						borderTopRightRadius={0}
						onChange={(e) => {
							e.preventDefault()
							setSearchTerm(e.target.value)
						}}
					>
					</Input>
					<IconButton
						aria-label={"search posts"}
						icon={<FaSearch/>}
						borderBottomLeftRadius={0}
						borderTopLeftRadius={0}
						onClick={() => {
							if (searchTerm !== null && searchTerm.trim() !== ""){
								redirect(`/posts/search?searchQuery=${searchTerm}`)
							}
						}}
					>
						Search Posts
					</IconButton>
				</Flex>
				<Spacer />
				<ThemeSwitch />
				{isLoading ? (
					<IconButton
						aria-label={"Loading"}
						icon={<FaSpinner />}
					/>
				) :	(
					profileData === null ? (
						<>
							<Button
								onClick={() => {
									redirect("/login")
								}}
								variant={"outline"}
							>
								Log In
							</Button>
							<Button
								onClick={() => {
									redirect("/signup")
								}}
								variant={"brandPrimary"}
							>
								Sign Up
							</Button>
							<Spacer maxWidth={"0.5vw"}/>
						</>
					) : (
						<>
							<Button onClick={() => {
								// redirect(`/users/${profileData.username}/`)
								resetLocalStorage()
								refreshAuth()
							}}>
								<Avatar
									src={profileData.avatarUrl}
									size={"sm"}
									aria-label={`${profileData.username}'s avatar`}
								/>
								<Spacer width={"0.5vw"} />
								<Text wordBreak={"keep-all"}>{profileData.profileName}</Text>
							</Button>
							<Spacer maxWidth={"0.5vw"}/>
						</>
					)
				)}
			</Flex>
		</Box>
	)
}

export {TopBar}