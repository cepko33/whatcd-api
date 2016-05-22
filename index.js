const COOKIE_FILE = 'cookie.json'

const log = require('loglevel')
const fs = require('fs')
const fsp = require('fs-promise')
const tryParseJson = require('try-parse-json')
const tough = require('tough-cookie')
const RateLimiter = require('limiter').RateLimiter
const path = require('path')
let rp = require('request-promise')

const Promise = require('bluebird')
Promise.onPossiblyUnhandledRejection(function(error) {
  throw error
})

// TODO move to files?
Encoding = {
  C192: '192',
  APS: 'APS (VBR)',
  V2: 'V2 (VBR)',
  V1: 'V1 (VBR)',
  C256: '256',
  APX: 'APX (VBR)',
  V0: 'V0 (VBR)',
  C320: '320',
  LOSSLESS: 'Lossless',
  LOSSLESS_24: '24bit Lossless',
  V8: 'V8 (VBR)'
}

class WhatCD {

  constructor(username, password) {
    this.domain = 'https://ssl.what.cd'
    this.username = username
    this.password = password
    this.loggedIn = false

    this.limiter = new RateLimiter(5, 10000) // = 5 per 10 seconds

    // if (fs.existsSync(COOKIE_FILE)) {
    //   this.jar = tough.CookieJar.fromJSON(fs.readFileSync(COOKIE_FILE, 'utf8')) // doesnt work but should
    // } else {
    //   // this.jar = new tough.CookieJar() // doesnt work but should work
    //   this.jar = rp.jar() // works but might not be compatible with tough-cookie fromJSON
    // }

    rp = rp.defaults({
      jar: true // use default jar for now
    })
  }

  enableMocking() {
    require(__dirname + '/test/mock.js')
  }

  static _isLoggedIn() {
    if (fs.existsSync(COOKIE_FILE)) {
      const cookieFile = fs.readFileSync(COOKIE_FILE, 'utf8')
      return tryParseJson(cookieFile) !== undefined //&& tryParseJson(cookieFile)
    }

    return false
  }

  static _buildUri(domain, endpoint, action, params) {
    if (!action) throw new Error('action parameter missing')
    if (!domain) throw new Error('domain parameter missing')
    if (params && typeof params !== 'object') throw new Error('invalid params parameter')

    let uri = `${domain}/${endpoint}.php?action=${action}`

    if (params) {
      for (let key of Object.keys(params)) {
        uri += `&${key}=${params[key]}`
      }
    }

    uri = encodeURI(uri)

    log.debug('Built URI: ' + uri)

    return uri
  }

  static _extractFilename(headers) {
    const contentDisposition = headers['content-disposition']

    if (contentDisposition.indexOf('attachment; filename="') !== 0) throw new Error('invalid content disposition')

    let filename = contentDisposition.replace('attachment; filename="', '')
    filename = filename.slice(0, filename.length - 1)
    filename = filename.replace(/-\d+\.torrent/, '.torrent')

    log.debug('Found filename: ' + filename)

    return filename
  }

  _login() {
    if (!this.username) throw new Error('username required')
    if (!this.password) throw new Error('password required')

    if (this.loggedIn) return Promise.resolve()

    return new Promise((resolve, reject) => {
      this.limiter.removeTokens(1, (err, remainingRequests) => {
        log.debug('Requests remaining: ', remainingRequests)

        resolve(rp({
            uri: this.domain + '/login.php',
            method: 'POST',
            form: {
              username: this.username,
              password: this.password,
              keeplogged: 1
            },
            json: true,
            simple: false,
            resolveWithFullResponse: true
          })
          .then(response => {
            if (response.statusCode === 302) {
              log.info('Logged in succesfully')
              this.loggedIn = true

              // const cookieJson = this.jar._jar.toJSON()
              // fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookieJson))
            } else reject(err)
          })
        )
      })
    })
  }

  action(action, params, endpoint = 'ajax', binary = false) {
    return new Promise((resolve, reject) => {

      const loginPromise = this._login()

      this.limiter.removeTokens(1, (err, remainingRequests) => {
        log.debug('Requests remaining: ', remainingRequests)

        loginPromise.then(() => {
          const actionPromise = rp({
              uri: WhatCD._buildUri(this.domain, endpoint, action, params),
              method: 'GET',
              json: true,
              resolveWithFullResponse: true,
              encoding: binary ? null : undefined
            })
            .then(function(response) {
              log.info('Action complete: ' + action, params)
              if (typeof response.body === 'string' && response.body.indexOf('<!DOCTYPE') === 0) throw new Error('cookie no longer valid? TODO')
              return response
            })

          resolve(actionPromise)
        })
      })
    })
  }

  search(artist, album) {
    function sanitizeResponse(results) {
      if (results.length === 0) {
        log.info('no results found')
        throw new Error('no results found')
      }

      const result = results[0]

      const sanitizedResponse = {
        artist: result.artist,
        album: result.groupName,
        image: result.cover,
        year: result.groupYear
      }

      const torrentMostSeeders = result.torrents.reduce((prev, current) => prev.seeders > current.seeders ? prev : current)

      sanitizedResponse.torrentId = torrentMostSeeders.torrentId
      sanitizedResponse.encoding = torrentMostSeeders.encoding

      if (torrentMostSeeders.seeders === 0) {
        log.info('no torrent found with > 0 seeders')
        throw new Error('no seeded torrent found')
      }

      return sanitizedResponse
    }

    function validateResponse(body) {
      if (body.status !== 'success') {
        log.debug(body)
        throw new Error('response failed')
      }
    }

    return this.action('browse', {
      artistname: artist,
      searchstr: album,
      encoding: Encoding.C320
    }).then(response => {
      let body = response.body
      validateResponse(body)

      if (body.response.results.length === 0) {
        return this.action('browse', {
          artistname: artist,
          searchstr: album,
          encoding: Encoding.V0
        }).then(response => {
          body = response.body
          validateResponse(body)

          return sanitizeResponse(body.response.results)
        })
      }

      return sanitizeResponse(body.response.results)
    })
  }

  download(id, targetpath) {
    if (path.extname(targetpath)) throw new Error('path cannot contain a filename')

    return this.action('download', {
        id: id
      },
      'torrents',
      true
    ).then(response => {
      const filename = WhatCD._extractFilename(response.headers)

      return fsp.writeFile(path.join(targetpath, filename), response.body, 'binary')
    })

  }
}

module.exports = WhatCD
