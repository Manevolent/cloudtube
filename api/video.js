const fetch = require("node-fetch")
const {render} = require("pinski/plugins")
const db = require("./utils/db")
const {getToken, getUser} = require("./utils/getuser")
const pug = require("pug")

class InstanceError extends Error {
	constructor(error, identifier) {
		super(error)
		this.identifier = identifier
	}
}

module.exports = [
	{
		route: "/watch", methods: ["GET"], code: async ({req, url}) => {
			const id = url.searchParams.get("v")
			const user = getUser(req)
			const settings = user.getSettingsOrDefaults()
			const outURL = `${settings.instance}/api/v1/videos/${id}`
			try {
				const video = await fetch(outURL).then(res => res.json())
				if (!video) throw new Error("The instance returned null.")
				if (video.error) throw new InstanceError(video.error, video.identifier)
				const subscribed = user.isSubscribed(video.authorId)
				return render(200, "pug/video.pug", {video, subscribed})
			} catch (e) {
				let message = pug.render("pre= error", {error: e.stack || e.toString()})
				if (e instanceof fetch.FetchError) {
					const template = `
p The selected instance, #[code= instance], did not respond correctly.
p Requested URL: #[a(href=url)= url]
`
					message = pug.render(template, {instance: settings.instance, url: outURL})
				} else if (e instanceof InstanceError) {
					const template = `
p #[strong= error.message]
if error.identifier
	p #[code= error.identifier]
p That error was generated by #[code= instance].
`
					message = pug.render(template, {instance: settings.instance, error: e})
				}
				return render(500, "pug/video.pug", {video: {videoId: id}, error: true, message})
			}
		}
	}
]