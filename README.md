# Discord Live Notifier
A simple Discord bot that notifies users whenever a streamer goes live, and allows them to subscribe to notifications for specific streamers.
The bot is written in Node.js using the [discord.js](https://discord.js.org/#/) library.

## Setup
### Prerequisites
- [Node.js](https://nodejs.org/en/) (version 14 or greater)
- [npm](https://www.npmjs.com/) (version 10 or greater)
- [git (optional)](https://git-scm.com/)

### Installation
1. Clone the repository using `git clone https://github.com/Atlas7005/discLiveNotify.git` or download the source code as a zip file and extract it.
2. Install the required dependencies using `npm install`.
3. Create a new Discord bot application and add it to your server. You can find a guide on how to do this [here](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot).
4. Create a new file called `.env` in the root directory of the project and add the following lines to it:
```env
TOKEN=your_bot_token
CLIENT_ID=your_twitch_client_id
CLIENT_SECRET=your_twitch_client_secret
```
You can find your bot token on the Discord developer portal, under the "Bot" section of your application. You can find your Twitch client ID and client secret on the [Twitch developer portal](https://dev.twitch.tv/console/apps).

5. Run the bot using `node app.js`.

## Usage
### Commands
- `n!ping` - Check if the bot is online.
- `n!notify <streamer>` - Subscribe to notifications for a streamer.
- `n!unnotify <streamer>` - Unsubscribe from notifications for a streamer.
- `n!list` - List all streamers you are subscribed to.
- `n!live <streamer>` - Check if a streamer is live.

### Notifications
The bot will send a DM to each subscribed user whenever a streamer goes live. The notification will contain the streamer's name, a link to their stream, and a preview image of their stream.