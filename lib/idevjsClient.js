// Copright 2016 iDevJS.com

const https = require('https')
const qs = require('querystring')
const url = require('url')
const util = require('util')

const DEFAULT_ERROR_CODE = -1
const DEFAULT_TIMEOUT_MS = 5000
const BASE_URI = 'api.idevjs.com'
const DEFAULT_VERSION = 'v1'
/**
 * Valid scope options.
 * @enum {string}
 */
export const Scope = {
  BASIC_PROFILE: 'basicProfile',
  LIST_PUBLICATIONS: 'listPublications',
  PUBLISH_POST: 'publishPost'
}


/**
 * The publish status when creating a post.
 * @enum {string}
 */
export const PostPublishStatus = {
  DRAFT: 'draft',
  UNLISTED: 'unlisted',
  PUBLIC: 'public'
}


/**
 * The content format to use when creating a post.
 * @enum {string}
 */
export const PostContentFormat = {
  HTML: 'html',
  MARKDOWN: 'markdown'
}


/**
 * The license to use when creating a post.
 * @enum {string}
 */
export const PostLicense = {
  ALL_RIGHTS_RESERVED: 'all-rights-reserved',
  CC_40_BY: 'cc-40-by',
  CC_40_BY_ND: 'cc-40-by-nd',
  CC_40_BY_SA: 'cc-40-by-sa',
  CC_40_BY_NC: 'cc-40-by-nc',
  CC_40_BY_NC_ND: 'cc-40-by-nc-nd',
  CC_40_BY_NC_SA: 'cc-40-by-nc-sa',
  CC_40_ZERO: 'cc-40-zero',
  PUBLIC_DOMAIN: 'public-domain'
}

/**
 * The core client.
 *
 * @param {{
 *  clientId: string,
 *  clientSecret: string
 * }} options
 */
export default class IDevJSClient {
  constructor(options = {}) {
    this._enforce(options, ['clientId', 'clientSecret'])
    this.options = options
    this._version = options.version || DEFAULT_VERSION
    this._clientId = options.clientId
    this._clientSecret = options.clientSecret
    this._accessToken = ''
  }

  /**
   * Sets an access token on the client used for making requests.
   *
   * @param {string} accessToken
   * @return {MediumClient}
   */
  setAccessToken(token) {
    this._accessToken = token
    return this
  }

  /**
   * Builds a URL at which you may request authorization from the user.
   *
   * @param {string} state
   * @param {string} redirectUrl
   * @param {Array.<Scope>} requestedScope
   * @return {string}
   */
  getAuthorizationUrl(state, redirectUrl, requestedScope) {
    return url.format({
      protocol: 'https',
      host: BASE_URI,
      pathname: '/oauth/authorize',
      query: {
        client_id: this._clientId,
        scope: requestedScope.join(','),
        response_type: 'code',
        state: state,
        redirect_uri: redirectUrl
      }
    })
  }

  /**
   * Exchanges an authorization code for an access token and a refresh token.
   *
   * @param {string} code
   * @param {string} redirectUrl
   * @param {NodeCallback} callback
   */
  exchangeAuthorizationCode(code, redirectUrl, callback) {
    this._acquireAccessToken({
      code: code,
      client_id: this._clientId,
      client_secret: this._clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUrl
    }, callback)
  }

  /**
   * Exchanges a refresh token for an access token and a refresh token.
   *
   * @param {string} refreshToken
   * @param {NodeCallback} callback
   */
  exchangeRefreshToken(refreshToken, callback) {
    this._acquireAccessToken({
      refresh_token: refreshToken,
      client_id: this._clientId,
      client_secret: this._clientSecret,
      grant_type: 'refresh_token'
    }, callback)
  }

  /**
   * Acquires an access token for the iDevJS API.
   *
   * Sets the access token on the client on success.
   *
   * @param {Object} params
   * @param {NodeCallback} callback
   */
  _acquireAccessToken(params, callback) {
    this._makeRequest({
      method: 'POST',
      path: '/oauth/tokens',
      contentType: 'application/x-www-form-urlencoded',
      data: qs.stringify(params)
    }, function (err, data) {
      if (!err) {
        this._accessToken = data.access_token
      }
      callback(err, data)
    }.bind(this))
  }

  /**
   * Returns the details of the user associated with the current
   * access token.
   *
   * Requires the current access token to have the basicProfile scope.
   *
   * @param {NodeCallback} callback
   */
  getUser(callback) {
    this._makeRequest({
      method: 'GET',
      path: '/me'
    }, callback)
  }

  getPostForUser(options, callback) {
    this._enforce(options, ['userId'])
    this._makeRequest({
      method: 'GET',
      path: '/users/' + options.userId + '/posts'
    }, callback)
  }

  /**
   * Creates a post on iDevJS.
   *
   * Requires the current access token to have the publishPost scope.
   *
   * @param {{
   *  userId: string,
   *  title: string,
   *  contentFormat: PostContentFormat,
   *  content: string,
   *  tags: Array.<string>,
   *  canonicalUrl: string,
   *  publishStatus: PostPublishStatus,
   *  license: PostLicense
   * }} options
   * @param {NodeCallback} callback
   */
  createPost(options, callback) {
    this._enforce(options, ['userId'])
    this._makeRequest({
      method: 'POST',
      path: '/users/' + options.userId + '/posts',
      data: {
        title: options.title,
        content: options.content,
        contentFormat: options.contentFormat,
        tags: options.tags,
        canonicalUrl: options.canonicalUrl,
        publishStatus: options.publishStatus,
        license: options.license
      }
    }, callback)
  }

  /**
   * Makes a request to the iDevJS API server.
   *
   * @param {Object} options
   * @param {NodeCallback} callback
   */
  _makeRequest(options, callback) {
    var requestParams = {
      host: BASE_URI,
      port: 443,
      method: options.method,
      path: `/${this._version}${options.path}`
    }
    var req = https.request(requestParams, (res) => {
      var body = []
      res.setEncoding('utf-8')
      res.on('data', (data) => {
        body.push(data)
      })
      res.on('end', () => {
        var payload
        var responseText = body.join('')
        try {
          payload = JSON.parse(responseText)
        } catch (err) {
          callback(new IDevJSError('Failed to parse response', DEFAULT_ERROR_CODE), null)
          return
        }

        var statusType = Math.floor(res.statusCode / 100)

        if (statusType == 4 || statusType == 5) {
          var err = payload.errors[0]
          callback(new IDevJSError(err.message, err.code), null)
        } else if (statusType == 2) {
          callback(null, payload.data || payload)
        } else {
          callback(new IDevJSError('Unexpected response', DEFAULT_ERROR_CODE), null)
        }
      })
    }).on('error', function (err) {
      callback(new IDevJSError(err.message, DEFAULT_ERROR_CODE), null)
    })

    req.setHeader('Content-Type', options.contentType || 'application/json')
    req.setHeader('Authorization', 'Bearer ' + this._accessToken)
    req.setHeader('Accept', 'application/json')
    req.setHeader('Accept-Charset', 'utf-8')

    req.setTimeout(DEFAULT_TIMEOUT_MS, function () {
      // Aborting a request triggers the 'error' event.
      req.abort()
    })

    if (options.data) {
      var data = options.data
      if (typeof data == 'object') {
        data = JSON.stringify(data)
      }
      req.write(data)
    }
    req.end()
  }

  _enforce(options, requiredKeys) {
    if (!options) {
      throw new IDevJSError('Parameters for this call are undefined', DEFAULT_ERROR_CODE)
    }
    requiredKeys.forEach(function (requiredKey) {
      if (!options[requiredKey]) throw new IDevJSError('Missing required parameter "' + requiredKey + '"', DEFAULT_ERROR_CODE)
    })
  }
}

/**
 * An error with a code.
 *
 * @param {string} message
 * @param {number} code
 * @constructor
 */
function IDevJSError(message, code) {
  this.message = message
  this.code = code
}
util.inherits(IDevJSError, Error)