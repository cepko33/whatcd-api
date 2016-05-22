# WhatCD API

Javascript WhatCD API based on promises.

# Installation

Requires Node >= 6.0

`npm install whatcd-api`


# Usage

Check [WhatCD API](https://github.com/WhatCD/Gazelle/wiki/JSON-API-Documentation) for all available endpoints. For example, the browse action (which searches WhatCD) requires a `searchstr` parameter so you must add that in the object passed to `what.action()`.

```js
const WhatCD = require('whatcd-api')

const what = new WhatCD('whatcd_username', 'whatcd_password')

what.action('browse', {
  searchstr: 'my favourite band'
}).then(response => {
  console.log(response)
})
```

### Rate limited

This library is rate limited to 5 requests per 10 seconds as specified by the WhatCD API documentation. So if you notice a few fast requests and sometimes a slow one, its probably waiting on rate limiting.

# API

`what.action(action=string, parameters=object)`: Low level method to perform any action as described in the WhatCD API documentation.

`what.search(artist=string, album=string)`: Helper method that searches for an artist/album. It will start at 320kbps and search for a V0 release if nothing was found.

`what.download(id=integer, path=string)`: Helper method to download a .torrent file from the torrent ID that was supplied. Will save to specified path. Path must not include a filename.

# Testing

`npm test` (will use fixtures)

Some tests require a username and password:  
`env WHATCD_USERNAME='' WHATCD_PASSWORD='' npm test -- -g 'login'`

For a live test (caution):  
`env WHATCD_USERNAME='' WHATCD_PASSWORD='' LIVE=true npm test -- -g 'search'`

Careful not to get banned for multiple false login attempts.

# Contribute

Pull requests very welcome! <3  
Please create an issue if you find a bug.

# License

MIT aka do whatever you want.
