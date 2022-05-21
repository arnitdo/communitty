import path = require("path");
import db = require("../utils/db");
import jwt = require("jsonwebtoken");

function validateEmail(email: string){
    let emailRegex: RegExp = /^[\w+-.]+@[\w\-.]+\.[a-zA-Z]{2,}$/;
    if (email.match(emailRegex)){
        return true;
    }
    return false;
}