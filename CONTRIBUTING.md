# Contribution Guidelines and Suggestions
 
So, you've decided to contribute to this wonderful communitty? Excellent! Here are a few guidelines and suggestions that would improve it further -
  
## Code Style and Formatting

 - Indent all code by a 4-width `Tab` only.
 - All variable names must be `camelCased`, with the exception of relevant React classes.
 - Write descriptive variable names. We've advanced beyond making single syllable sounds, make it reflect in code too.
 - Avoid variables like `i`, `ii`, `iiiiiii123`. Why not `index`, `innerIndex`, or `internalIndex123`?
 - Avoid extensive use of compound operators or chained operations. Break your one-liner into smaller bits.
 - Wherever possible, document your thinking process when writing a block of code.
 - If function parameter lists are too large, you may split them onto multiple lines as shown : 
    ```js
    // Avoid
    createLaserOfDoom(superSpecificLongNamedArgument, reallyLongVariableName, {someParameter : someValue})
    
    // Preferrable
    createLaserOfDoom(
      superSpecificLongNamedArgument,
      reallyLongVariableName,
      {
        someParameter : someValue
      }
    )
    
    ```
    
## Pull Requests

 - **All** pull requests must be made to development branches. These will be prefixed with the word `dev`.
 - Any pull requests made to the `main` branch will be immediately rejected.
 - All pulls must successfully build on Node 16.x.
 - Any trivial pull requests that only make incoherent or irrelevant changes, for, contribution targets or achievements, will be immediately rejected.
 - You may be banned from further contributions. This repository is not a playground to fulfil your contribution badge on your resume.
 - Documentation pull requests are highly welcome.

## Issues
 - Please follow a good code of conduct when creating issues.
 - Avoid disclosing personal information in attached media / screenshots / videos.
 - A well-crafted issue will get sorted out earlier.
 - Attach steps-to-reproduce, whenever possible.
 - Obscure and non-reproducible bugs may be marked as wontfix. Reopen the issue if it consistently arises
