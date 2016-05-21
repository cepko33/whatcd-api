const expect = require('chai').expect
const fs = require('fs')
const log = require('loglevel')

const WhatCD = require('../index.js')

const COOKIE_FILE = 'cookie.json'

if (process.env.VERBOSE) {
  log.setLevel(process.env.VERBOSE)
}

function deleteCookie() {
  if (fs.existsSync(COOKIE_FILE)) fs.unlinkSync(COOKIE_FILE)
}

describe.skip('cookie tests', function() {

  it('isLoggedIn without cookie', () => {
    deleteCookie()
    const what = new WhatCD(process.env.WHATCD_USERNAME, process.env.WHATCD_PASSWORD)

    expect(WhatCD._isLoggedIn()).to.be.false
  })

  it('isLoggedIn with empty cookie', () => {
    deleteCookie()
    const what = new WhatCD(process.env.WHATCD_USERNAME, process.env.WHATCD_PASSWORD)

    fs.writeFileSync(COOKIE_FILE, '[]')

    expect(WhatCD._isLoggedIn()).to.be.false

    deleteCookie()
  })

  it('isLoggedIn with valid cookie', () => {
    deleteCookie()
    const what = new WhatCD(process.env.WHATCD_USERNAME, process.env.WHATCD_PASSWORD)

    fs.writeFileSync(COOKIE_FILE, '[{}, {}]')

    expect(WhatCD._isLoggedIn()).to.be.true

    deleteCookie()
  })

  it('should login successfully and create cookie.json', (done) => {
    deleteCookie()
    const what = new WhatCD(process.env.WHATCD_USERNAME, process.env.WHATCD_PASSWORD)

    what._login()
      .then(response => {
        expect(fs.existsSync(COOKIE_FILE)).to.be.true
        deleteCookie()
        done()
      })
  })
})

describe('whatcd tests', function() {
  this.timeout(10000)

  it('should search and return result object', (done) => {
    const what = new WhatCD(process.env.WHATCD_USERNAME, process.env.WHATCD_PASSWORD)

    what.action('browse', {
        searchstr: 'sven hammond soul'
      })
      .then(response => {
        expect(response).to.be.an('object')
        done()
      })
  })

  it('should search twice and already be logged in the second search', (done) => {
    const what = new WhatCD(process.env.WHATCD_USERNAME, process.env.WHATCD_PASSWORD)

    what.action('browse', {
        searchstr: 'sven hammond soul'
      })
      .then(response => {
        // fs.writeFileSync('./test/fixtures/browse.json', JSON.stringify(response))
        expect(response).to.be.an('object')

        what.action('browse', {
            searchstr: 'sven hammond soul'
          })
          .then(response => {
            expect(response).to.be.an('object')
            done()
          })
      })
  })

  it('should find a 320 album with seeders', (done) => {
    const what = new WhatCD(process.env.WHATCD_USERNAME, process.env.WHATCD_PASSWORD)

    what.search('rammstein', 'sehnsucht')
      .then(response => {
       expect(response).to.be.an('object')
      //  console.log(JSON.stringify(response))
        expect(response).to.deep.equal({
          artist: 'Rammstein',
          album: 'Sehnsucht',
          image: 'https://whatimg.com/i/kijo9n.jpg',
          year: 1997,
          torrentId: 30836090,
          encoding: '320'
        })
        done()
      })
  })

  it('should find a V0 album with seeders', (done) => {
    const what = new WhatCD(process.env.WHATCD_USERNAME, process.env.WHATCD_PASSWORD)

    what.search('jamie berry', 'electric rainbow')
      .then(response => {
        expect(response).to.be.an('object')
        expect(response).to.deep.equal({
          artist: 'Jamie Berry',
          album: 'Electric Rainbow',
          image: 'http://ecx.images-amazon.com/images/I/513tMjKOgiL._SL500_AA500_.jpg',
          year: 2011,
          torrentId: 30541551,
          encoding: "V0 (VBR)"
        })

        done()
      })
  })
})

describe('library tests', function() {
  this.timeout(15000)

  it('should build valid uri', () => {
    const uri = WhatCD._buildUri('https://ssl.what.cd', 'browse', {
      searchstr: 'rammstein'
    })

    expect(uri).to.be.a('string')
    expect(uri).to.equal(`https://ssl.what.cd/ajax.php?action=browse&searchstr=rammstein`)
  })

  it('should rate limit to take atleast 10 seconds to perform 6 requests', (done) => {
    const startTime = (new Date()).getTime()

    const what = new WhatCD(process.env.WHATCD_USERNAME, process.env.WHATCD_PASSWORD)

    // login is also a request
    what.action('browse', {
        searchstr: 'sven hammond soul'
      })
      .then(response => {
        expect(response).to.be.an('object')

        what.action('browse', {
            searchstr: 'sven hammond soul'
          })
          .then(response => {
            expect(response).to.be.an('object')

            what.action('browse', {
                searchstr: 'sven hammond soul'
              })
              .then(response => {
                expect(response).to.be.an('object')

                what.action('browse', {
                    searchstr: 'sven hammond soul'
                  })
                  .then(response => {
                    expect(response).to.be.an('object')

                    what.action('browse', {
                        searchstr: 'sven hammond soul'
                      })
                      .then(response => {
                        expect(response).to.be.an('object')
                        expect((new Date()).getTime() - startTime).to.be.at.least(10000)
                        done()
                      })
                  })
              })
          })
      })
  })
})
