export function baseURL(): string {
    if (process.env.NODE_ENV === "development"){
        return "http://localhost:8800"
    } else {
        return "https://communitty.herokuapp.com"
    }
}