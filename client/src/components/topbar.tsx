import * as React from 'react'
import {useState} from 'react'
import {InfoIcon, SearchIcon} from '@chakra-ui/icons'
import {Avatar, Button, Flex, IconButton, Input, Spacer, Text} from "@chakra-ui/react";
import {useAPIRequest} from "../utils/apiHandler";
import {useNavigate} from "react-router-dom";

import '../styles/topbar.css';

function TopBar(): JSX.Element {

	const response = useAPIRequest({
		url: "/users/me",
		useAuthentication: true
	})

	const navigate = useNavigate()

	return (
		<div className={"top-bar"}>
			<Flex>
				<InfoIcon/>
				<Spacer/>
				<Input
					className={"search-bar"}
					placeholder={"Search posts"}
					minWidth={"30vw"}
					maxWidth={"50vw"}>
				</Input>
				<IconButton
					className={"search-button"}
					aria-label={"search posts"}
					icon={<SearchIcon></SearchIcon>}>
					Search Posts
				</IconButton>
				<Spacer/>
				{true ? (
					<Button>
						<Avatar src={""}></Avatar>
						<Text style={
							{
								whiteSpace: "nowrap"
							}
						}>{""}</Text>
					</Button>
				) : (
					<>
						<Button variant={"outline"} onClick={() => {
							navigate("/login")
						}}>
							Log In
						</Button>
						<Button variant={"solid"} onClick={() => {
							navigate("/signup")
						}}>
							Sign Up
						</Button>
					</>
				)}
			</Flex>
		</div>
	)
}

export {TopBar}