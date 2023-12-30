require("dotenv").config();
const axios = require("axios").default;
const { readFileSync, writeFileSync, existsSync } = require("fs");
const Discord = require("discord.js");
const { schedule } = require("node-cron");

const client = new Discord.Client({ intents: [ Discord.GatewayIntentBits.DirectMessages, Discord.GatewayIntentBits.GuildMessages, Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.MessageContent ], partials: [ Discord.Partials.Channel, Discord.Partials.Message ] });

let tokenData = null;

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity("n!notifyme", { type: "LISTENING" });

    if(!existsSync("notifiers.json")) {
        writeFileSync("notifiers.json", "{}");
    }
});

client.on("messageCreate", async (msg) => {
    if(msg.author.bot) return;
    if(!msg.content.startsWith("n!")) return;
    const args = msg.content.split(" ");
    const command = args.shift().replace("n!", "").toLowerCase();
    
    switch(command) {
        case "ping":
            msg.reply("Pong!");
            break;
        case "notify":
        case "notifyme": {
            const username = args.shift();
            const user = msg.author;

            const data = JSON.parse(readFileSync("notifiers.json"));
            if(data[username.toLowerCase()]) {
                if(data[username.toLowerCase()].users.includes(user.id)) {
                    msg.reply("You are already being notified when " + username + " goes live!");
                    return;
                }
                data[username.toLowerCase()].users.push(user.id);
                msg.reply("You will now be notified when " + username + " goes live!");
            } else {
                if((await doesTwitchUserExist(username)) === false) return msg.reply("That user does not exist on Twitch!");
                data[username.toLowerCase()] = {
                    users: [ user.id ],
                    isLive: false
                }
                msg.reply("You will now be notified when " + username + " goes live!");
            }
            writeFileSync("notifiers.json", JSON.stringify(data, null, 4));
            break;
        }
        case "unnotify":
        case "unnotifyme": {
            const username = args.shift();
            const user = msg.author;

            const data = JSON.parse(readFileSync("notifiers.json"));
            if(data[username.toLowerCase()]) {
                if(data[username.toLowerCase()].users.includes(user.id)) {
                    data[username.toLowerCase()].users.splice(data[username.toLowerCase()].users.indexOf(user.id), 1);
                    msg.reply("You will no longer be notified when " + username + " goes live!");
                    if(data[username.toLowerCase()].users.length === 0) delete data[username.toLowerCase()];
                } else {
                    msg.reply("You are not being notified when " + username + " goes live!");
                }
            } else {
                msg.reply("You are not being notified when " + username + " goes live!");
            }
            writeFileSync("notifiers.json", JSON.stringify(data, null, 4));
            break;
        }
        case "islive":
        case "live": {
            const username = args.shift();

            getToken().then((token) => {
                axios({
                    url: `https://api.twitch.tv/helix/streams?user_login=${username.toLowerCase()}`,
                    method: "GET",
                    headers: {
                        "Client-ID": process.env.CLIENT_ID,
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }).then((res) => {
                    const stream = res.data.data[0];
                    if(stream) {
                        msg.reply(stream.user_name + " is live!");
                    } else {
                        msg.reply(username + " is not live!");
                    }
                }).catch((err) => {
                    console.log(err);
                });
            }).catch((err) => {
                console.log(err);
            });
            break;
        }
        default:
            break;
    }
});

client.login(process.env.TOKEN);

schedule("*/5 * * * *", () => {
    console.log("Checking for live streams...");
    const data = JSON.parse(readFileSync("notifiers.json"));
    
    const streamers = Object.keys(data);

    if(streamers.length === 0) return;

    getToken().then((token) => {
        axios({
            url: `https://api.twitch.tv/helix/streams?user_login=${streamers.join("&user_login=")}`,
            method: "GET",
            headers: {
                "Client-ID": process.env.CLIENT_ID,
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        }).then((res) => {
            const streams = res.data.data;
            if(streams.length === 0) {
                for(const streamer of streamers) {
                    if(data[streamer.toLowerCase()].isLive) {
                        console.log(streamer + " is no longer live!");
                        data[streamer.toLowerCase()].isLive = false;
                    }
                }
                writeFileSync("notifiers.json", JSON.stringify(data, null, 4));
                return;
            }
            console.log("Live:",streams.map((stream) => stream.user_name).join(", "));
            axios({
                url: `https://api.twitch.tv/helix/users?id=${streams.map((stream) => stream.user_id).join("&id=")}`,
                method: "GET",
                headers: {
                    "Client-ID": process.env.CLIENT_ID,
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }).then((res) => {
                const users = res.data.data;
                for(const stream of streams) {
                    if(data[stream.user_login.toLowerCase()]) {
                        if(!data[stream.user_login.toLowerCase()].isLive) {
                            data[stream.user_login.toLowerCase()].isLive = true;
                            for(const user of data[stream.user_login.toLowerCase()].users) {
                                client.users.fetch(user).then((user) => {
                                    user.send({
                                        content: `<@${user.id}>\nYou are receiving this message because you have told me to notify you when ${stream.user_name} goes live!\nIf you want to stop receiving these messages, use \`n!unnotify ${stream.user_login}\`!`,
                                        embeds: [
                                            {
                                                author: {
                                                    name: stream.user_name,
                                                    icon_url: users.find((user) => user.id === stream.user_id).profile_image_url
                                                },
                                                title: stream.user_name + " is now live!",
                                                description: stream.title+"\n\nPress [here](<https://twitch.tv/"+stream.user_login+">) to watch the stream!",
                                                url: "https://twitch.tv/" + stream.user_login,
                                                color: 0x9146ff,
                                                image: {
                                                    url: stream.thumbnail_url.replace("{width}", "1280").replace("{height}", "720")
                                                },
                                                timestamp: new Date(stream.started_at)
                                            }
                                        ]
                                    });
                                });
                            }
                            writeFileSync("notifiers.json", JSON.stringify(data, null, 4));
                        }
                    }
                }

                for(const streamer of streamers) {
                    if(!streams.find((stream) => stream.user_login.toLowerCase() === streamer.toLowerCase()) && data[streamer.toLowerCase()].isLive) {
                        data[streamer.toLowerCase()].isLive = false;
                    }
                }
                writeFileSync("notifiers.json", JSON.stringify(data, null, 4));
            }).catch((err) => {
                console.log(err);
            });
        }).catch((err) => {
            console.log(err);
        });
    }).catch((err) => {
        console.log(err);
    });
});

function getToken() {
    return new Promise((resolve, reject) => {
        if(tokenData && tokenData.expires_at > Date.now()) return resolve(tokenData.access_token);
        axios({
            url: `https://id.twitch.tv/oauth2/token`,
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data: `client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&grant_type=client_credentials`
        }).then((res) => {
            tokenData = {
                access_token: res.data.access_token,
                expires_at: Date.now() + (res.data.expires_in * 1000)
            };
            return resolve(res.data.access_token);
        }).catch((err) => {
            return reject(err);
        });
    });
};

function doesTwitchUserExist(username) {
    return new Promise((resolve, reject) => {
        getToken().then((token) => {
            axios({
                url: `https://api.twitch.tv/helix/users?login=${username}`,
                method: "GET",
                headers: {
                    "Client-ID": process.env.CLIENT_ID,
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }).then((res) => {
                return resolve(true);
            }).catch((err) => {
                return resolve(false);
            });
        }).catch((err) => {
            return reject(err);
        });
    });
};