const fetch = require("node-fetch")
const db = require("./db")

async function fetchChannel(ucid, instance) {
	// fetch
	const channel = await fetch(`${instance}/api/v1/channels/${ucid}`).then(res => res.json())
	// update database
	const bestIcon = channel.authorThumbnails.slice(-1)[0]
	const iconURL = bestIcon ? bestIcon.url : null
	db.prepare("REPLACE INTO Channels (ucid, name, icon_url) VALUES (?, ?, ?)").run([channel.authorId, channel.author, iconURL])
	// return
	return channel
}

function fetchChannelLatest(ucid) {
	return fetch(`http://localhost:3000/api/v1/channels/${ucid}/latest`).then(res => res.json()).then(root => {
		root.forEach(video => {
			video.descriptionHtml = video.descriptionHtml.replace(/<a /g, '<a tabindex="-1" ')
		})
		return root
	})
}

module.exports.fetchChannel = fetchChannel
module.exports.fetchChannelLatest = fetchChannelLatest
