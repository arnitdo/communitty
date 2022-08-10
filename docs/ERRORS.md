## Preface

This document aims to explain each action result error code in detail.

## Status Codes

The backend API aims to follow all HTTP Status Codes wherever possible.
In case of a same status code for different results, refer to the `actionResult` property of the response object.

 - `200` -> HTTP OK, Request was well-formed and the desired action was completed successfully.
 - `400` -> HTTP Bad Request, request was ill-formed, due to one or more of the following reasons:
   - Request body did not have necessary parameters / properties.
     - `actionResult` is set to `ERR_MISSING_BODY_PARAMS`
     - Response body contains the `missingProperties` field, which lists all missing properties.
     - Check if you are providing all the necessary request parameters. Case sensitivity matters
   - Request parameters were provided, but in an incorrect format or data type.
     - `actionResult` is set to `ERR_INVALID_PROPERTIES`
     - Response body contains the `invalidProperties` field, which lists all invalid properties
     - Check if you are providing the correct type of request parameter
   
 - `403` -> HTTP Unauthorized, request was well-formed, but proper authorization headers were not provided / were incorrect