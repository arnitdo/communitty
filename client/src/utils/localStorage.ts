import { useState, useEffect } from "react";

function getStorageValue(key: string, defaultValue : any = null) {
	// getting stored value
	const storageValue = localStorage.getItem(key);
	if (storageValue == null || storageValue == "null"){
		return defaultValue
	}
	return storageValue;
}

function useLocalStorage(key: string, defaultValue : any = null){
	const [value, setValue] = useState(() => {
		return getStorageValue(key, defaultValue);
	});

	useEffect(() => {
		localStorage.setItem(key, value);
	}, [key, value]);

	return [value, setValue];
}

export {
	useLocalStorage
}