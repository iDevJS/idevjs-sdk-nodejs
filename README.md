# iDevJS SDK for NodeJS

This repository contains the open source SDK for integrating iDevJS's OAuth2 API into your NodeJs app.

View the full [documentation here](https://github.com/iDevJS/idevjs-api-docs).

## Install

```
npm install idevjs-sdk
```

## Usage

Create a client, then call commands on it.

```
import IDevJSClient, {Scope} from 'idevjs-sdk'

const client = new IDevJSClient({
  clientId: 'your client id',
  clientSecret: 'your client secret'
})

const redirectUrl = 'http://youcallback.url'
/**
 * 1. 
 * Get authorizationUrl, provided redirectUrl, scopes you requested and state as paramaters
 */
const authorizationUrl = client.getAuthorizationUrl(redirectUrl, [Scope.BASIC_PROFILE, Scope.PUBLISH_POST], 'you state')

/**
 * 2.
 * Then redirect user to the authorization url,
 * after user authorized your app,
 * iDevJS will redirect user to the redirectUrl you provided with authorization code.
 */ 
client.exchangeAuthorizationCode('YOUR_AUTHORIZATION_CODE', redirectUrl).then((token) => {
  client.setAccessToken(token)
})

// Now you can call client commands to access iDevJS.com api.

client.getUser().then((data) => {
  
})

```

## Contributing

Questions, comments, bug reports, and pull requests are all welcomed.

## Authors

[xuhong](https://github.com/xuhong)

## License

MIT.