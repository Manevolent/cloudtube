const {render} = require("pinski/plugins")
const db = require("../utils/db")
const {getUser} = require("../utils/getuser")
const {timeToPastText, rewriteVideoDescription, applyVideoFilters} = require("../utils/converters")
const {refresher} = require("../background/feed-update")

module.exports = [
	{
		route: `/subscriptions`, methods: ["GET"], code: async ({req, url}) => {
			const user = getUser(req)
			let hasSubscriptions = false
			let videos = []
			let channels = []
			let refreshed = null
			if (user.token) {
				// trigger a background refresh, needed if they came back from being inactive
				refresher.skipWaiting()
				// get channels
				const subscriptions = user.getSubscriptions()
				const template = Array(subscriptions.length).fill("?").join(", ")
				channels = db.prepare(`SELECT * FROM Channels WHERE ucid IN (${template}) ORDER BY name`).all(subscriptions)
				// get refreshed status
				refreshed = db.prepare(`SELECT min(refreshed) as min, max(refreshed) as max, count(refreshed) as count FROM Channels WHERE ucid IN (${template})`).get(subscriptions)
				// get watched videos
				const watchedVideos = user.getWatchedVideos()
				// get videos
				if (subscriptions.length) {
					hasSubscriptions = true
					const template = Array(subscriptions.length).fill("?").join(", ")
					videos = db.prepare(`SELECT * FROM Videos WHERE authorId IN (${template}) ORDER BY published DESC LIMIT 60`).all(subscriptions)
						.map(video => {
							video.publishedText = timeToPastText(video.published * 1000)
							video.watched = watchedVideos.includes(video.videoId)
							video.descriptionHtml = rewriteVideoDescription(video.descriptionHtml, video.videoId)
							return video
						})
				}
				const filters = user.getFilters()
				;({videos} = applyVideoFilters(videos, filters))
			}
			const settings = user.getSettingsOrDefaults()
			const instanceOrigin = settings.instance
			return render(200, "pug/subscriptions.pug", {url, settings, hasSubscriptions, videos, channels, refreshed, timeToPastText, instanceOrigin})
		}
	}
]
