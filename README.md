
:warning: I'm currently writing [version 2](https://github.com/jpillora/cloud-torrent) in [Go](http://golang.org) and won't be adding anymore features to this version. If you'd like to be the maintainer or contributer of this version, please leave a comment [here](https://github.com/jpillora/node-torrent-cloud/issues/1).

---


# Torrent Cloud

**A torrent client in the cloud, written in [Node.js](http://nodejs.org)**

There are a various existing cloud torrent services (bitport.io, btcloud.io, put.io), though they're all subscription-based or have limits imposed. Torrent Cloud is intended to be self-hosted on your own cloud compute combined with your own cloud storage. When a file is downloaded, Torrent Cloud simultaneously downloads and uploads the file, so when a torrent is complete, you'll find it in your own storage.

![screenshot](https://cloud.githubusercontent.com/assets/633843/6997094/f0f0b934-dbf0-11e4-8766-56b0756f3250.png)

**Disclaimer** This project was created to bring about an addition download channel to defeat unfair BitTorrent protocol restrictions imposed by enterprises and ISPs. It was intended for downloading legal, non-copywrite material, such as: public linux distributions, personal files, large public statistical datasets, public domain images and videos from archive.org, etc. This project will not take any responsibility for any illegal use, by using this software you agree to these terms.

## Features

* Embedded torrent search
* Load torrents via magnet URI or torrent file URL
* Magnet URI editor
* Responsive WebUI (Mobile friendly)
* Download all as streaming ZIP file
* Uses high-bandwidth upload download of cloud providers

### Installation

1. Setup your cloud storage (*Choose one*)

	* AWS
		1. Sign up for a free for 1 year [Amazon Web Services](https://aws.amazon.com) account
		1. Go to the [AWS Console](https://console.aws.amazon.com/)
		1. Retrieve your API keys (*Top-right menu `[Your Name] > Security Credentials`*)
		1. Create an S3 bucket in the region closest to you
		1. Set `AWS_ACCESS_KEY` AWS Access key (**Required**)
		1. Set `AWS_SECRET_KEY` AWS Secret key (**Required**)
		1. Set `AWS_BUCKET` The S3 bucket name (**Required**)
		1. Set `AWS_REGION` The S3 bucket region code (**Required** see [region codes](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html#concepts-regions))

	* Mega **Warning: the Mega backend is quite buggy**
		1. Sign up for a free [Mega](https://mega.co.nz) account
		1. Set `MEGA_EMAIL` to your username (email address) (**Required**)
		1. Set `MEGA_PASS` to your password (**Required**)

	*Note: See the [contribute](#Contributing) section for adding more storage backends*

1. Consider these environment variables

	1. `HOST` Listening interface (**Optional** defaults to all `0.0.0.0`)
	1. `PORT` Listening port (**Optional** default `3000`)
	1. `AUTH_USER` HTTP Basic Auth (**Optional** default `admin`)
	1. `AUTH_PASSWORD` HTTP Basic Auth (**Optional** if set HTTP auth will be enabled)
	1. `SEARCH_PROVIDERS_URL` URL to a JSON configuration file (**Optional** see below)

1. Setup your cloud hosting environment

	1. Heroku
	
		1. Sign up for a free [Heroku](https://heroku.com) account
		1. Deploy your own copy of this app to Heroku

			[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

	1. Others

		1. Install Node
		1. `$ npm i -g torrent-cloud`
		1. `env PORT=8080 torrent-cloud`

1. And that's it! (On Heroku, visit `https://<appname>.herokuapp.com`)

*You can change these via the [Heroku command-line tool](https://devcenter.heroku.com/articles/heroku-command) or in the [Heroku dashboard](https://dashboard.heroku.com) `Apps > App > Config Variables > Reveal > Edit`.*

### Search Providers

Torrent Cloud provides an easy way to screen-scrape any of the [copyright-free (legal) torrent sites](http://www.techsupportalert.com/content/finding-legal-and-free-torrents.htm). The search provider specification can be found here: https://gist.github.com/jpillora/e667f3d16a6bd403edc4. Please add your custom providers in the comment section.

### Contributing

**Backend** A Node.js app using Express, WebSockets, and many other modules. The server entry point is `server.js` and the modules are inside `lib/`, they're documented in the comments though questions are welcome via Issues. Currently there are only Mega and AWS storage backends, though contributions are wanted. To get started, take a look at [`lib/backends/_template.js`](https://github.com/jpillora/torrent-cloud/blob/master/lib/backends/_template.js) for the required interface.

**Frontend** An Angular app with related all files in `static/`. The HTTP API is for initiating all actions (e.g. start/stop torrent), and will return an error or an empty OK. The entire app state is sent, on change, via WebSockets.

## Help!

* Q. If deployment succeeds but the page isn't loading?
* A. View torrent-cloud's stdout. On Heroku, you can view logs with: `heroku logs --tail --<appname>` (`heroku` tool required). You're most likely missing one of storage environment variables above.
* Q. Download speed goes up then down?
* A. There is a 50MB buffer, so once the download goes 50MB past the upload, it will stop and wait for the upload to catch up.
* Q. Why is the Mega backend is buggy?
* A. It uses an old library and it hasn't been tested as much as the AWS backend.
* Q. Heroku dynos turn Idle after 30 minutes of no requests?
* A. Use https://uptimerobot.com/ to ping it, you also get the added benefit of tracking its uptime

Ask questions on the Issues page.

## Known Issues

* Only supports modern browsers
* Heroku restarts free dynos every day, so your open torrents will be closed once a day. This will also occur every time your app "idles", which can be prevented with a periodic ping, from a service like Uptime Robot, etc. This makes it impossible to download slow torrents over a long period of time.

## Todo

* Config file
	* Reconfigurable in UI
* [Mega streaming media](https://github.com/jpillora/mega-stream)
* More search providers
* More storage backends
	* Local file system
	* [Plex Integration](https://support.plex.tv/hc/en-us/articles/203082447-Supported-Cloud-Storage-Providers)
		* Dropbox
		* Google Drive
		* Copy
		* Box
* More hosting providers
	* Nodejitsu
	* Openshift (Tested though torrent's seem to be unable to connect to the swarm)
* Use backend storage to keep app state between restarts
* Improve UI
	* Make use of screen real estate with mobile in mind
	* Drop-in torrent files
	* Improved file management
		* Save as
		* Rename
		* Folder management
			* Folder UI
* Better download previewers
	* Add Flash fallback for MP3s in Chrome
* Port to Go using [anacrolix/torrent](https://github.com/anacrolix/torrent)

## Credits

Built around [@mafintosh](https://github.com/mafintosh)'s awesome [torrent-stream](https://github.com/mafintosh/torrent-stream).

#### MIT License

Copyright &copy; 2015 Jaime Pillora &lt;dev@jpillora.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
