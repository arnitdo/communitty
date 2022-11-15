import {createContext} from 'react'
import {ProfileContextType} from "./typeDefs";

const ProfileContext = createContext<ProfileContextType | null>(null)

export {
	ProfileContext
}