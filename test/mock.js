if (process.env.LIVE) {
  console.log('Data mocking disabled, using live connection')
} else {
  console.log('Data mocking enabled')
  const nock = require('nock')
  const fs = require('fs')

  // nock.disableNetConnect()

  nock('https://ssl.what.cd')
    .post('/login.php')
    .reply(302)
    .persist()

  nock('https://ssl.what.cd')
    .get('/ajax.php?action=browse&searchstr=sven%20hammond%20soul')
    .reply(200, () => {
      return JSON.parse(fs.readFileSync(__dirname + '/fixtures/browse.json', 'utf8'))
    })
    .persist()

  nock('https://ssl.what.cd')
    .get('/ajax.php?action=browse&artistname=rammstein&searchstr=sehnsucht&encoding=320')
    .reply(200, () => {
      return JSON.parse(fs.readFileSync(__dirname + '/fixtures/search320_rammstein.json', 'utf8'))
    })

  nock('https://ssl.what.cd')
    .get('/ajax.php?action=browse&artistname=jamie%20berry&searchstr=electric%20rainbow&encoding=320')
    .reply(200, () => {
      return JSON.parse(fs.readFileSync(__dirname + '/fixtures/search320_jamieberry.json', 'utf8'))
    })

  nock('https://ssl.what.cd')
    .get('/ajax.php?action=browse&artistname=jamie%20berry&searchstr=electric%20rainbow&encoding=V0%20(VBR)')
    .reply(200, () => {
      return JSON.parse(fs.readFileSync(__dirname + '/fixtures/searchv0_jamieberry.json', 'utf8'))
    })

  nock('https://ssl.what.cd')
    .get('/torrents.php?action=download&id=30836090')
    .reply(200, 'binary data here', {
      'content-disposition': 'attachment; filename="Rammstein - Sehnsucht - 1997 (CD - MP3 - 320)-30836090.torrent"'
    })
}
