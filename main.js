const url = new URL(window.location.href);

const config = {
    channel: url.searchParams.get("channel"),
    currentStreak: { streak: 1, emote: "", url: "" },
    streakEnabled: !!Number(url.searchParams.get("streakEnabled") || 1),
    showEmoteEnabled: !!Number(url.searchParams.get("showEmoteEnabled") || 1),
    showEmoteCooldown: Number(url.searchParams.get("showEmoteCooldown") || 6),
    showEmoteSizeMultiplier: Number(
        url.searchParams.get("showEmoteSizeMultiplier") || 1
    ),
    minStreak: Number(url.searchParams.get("minStreak") || 5),
    emoteLocation: Number(url.searchParams.get("emoteLocation") || 1),
    emoteStreakEndingText:
        url.searchParams.get("emoteStreakText")?.replace(/(<([^>]+)>)/gi, "") ??
        "streak!",
    showEmoteCooldownRef: new Date(),
    streakCooldown: new Date().getTime(),
    emotes: [],
};

const getEmotes = async () => {
    // const proxy = "https://tpbcors.herokuapp.com/";
    const proxy = "https://api.roaringiron.com/proxy/";
    console.log(config);

    if (!config.channel)
        return $("#errors").html(
            `Invalid channel. Please enter a channel name in the URL. Example: https://emote.slaiqe.gg/?channel=forsen`
        );

    const twitchId = (
        await (
            await fetch(
                proxy + "https://api.ivr.fi/v2/twitch/user?login=" + config.channel,
                {
                    headers: { "User-Agent": "api.roaringiron.com/emoteoverlay" },
                }
            )
        ).json()
    )?.[0].id;

    await (
        await fetch(
            proxy + "https://api.frankerfacez.com/v1/room/" + config.channel
        )
    )
        .json()
        .then((data) => {
            const emoteNames = Object.keys(data.sets);
            for (let i = 0; i < emoteNames.length; i++) {
                for (let j = 0; j < data.sets[emoteNames[i]].emoticons.length; j++) {
                    const emote = data.sets[emoteNames[i]].emoticons[j];
                    config.emotes.push({
                        name: emote.name,
                        url:
                            "https://" +
                            (emote.urls["2"] || emote.urls["1"]).split("//").pop(),
                    });
                }
            }
        })
        .catch(console.error);

    await (
        await fetch(proxy + "https://api.frankerfacez.com/v1/set/global")
    )
        .json()
        .then((data) => {
            const emoteNames = Object.keys(data.sets);
            for (let i = 0; i < emoteNames.length; i++) {
                for (let j = 0; j < data.sets[emoteNames[i]].emoticons.length; j++) {
                    const emote = data.sets[emoteNames[i]].emoticons[j];
                    config.emotes.push({
                        name: emote.name,
                        url:
                            "https://" +
                            (emote.urls["2"] || emote.urls["1"]).split("//").pop(),
                    });
                }
            }
        })
        .catch(console.error);

    await (
        await fetch(
            proxy + "https://api.betterttv.net/3/cached/users/twitch/" + twitchId
        )
    )
        .json()
        .then((data) => {
            for (let i = 0; i < data.channelEmotes.length; i++) {
                config.emotes.push({
                    name: data.channelEmotes[i].code,
                    url: `https://cdn.betterttv.net/emote/${data.channelEmotes[i].id}/2x`,
                });
            }
            for (let i = 0; i < data.sharedEmotes.length; i++) {
                config.emotes.push({
                    name: data.sharedEmotes[i].code,
                    url: `https://cdn.betterttv.net/emote/${data.sharedEmotes[i].id}/2x`,
                });
            }
        })
        .catch(console.error);

    await (
        await fetch(proxy + "https://api.betterttv.net/3/cached/emotes/global")
    )
        .json()
        .then((data) => {
            for (let i = 0; i < data.length; i++) {
                config.emotes.push({
                    name: data[i].code,
                    url: `https://cdn.betterttv.net/emote/${data[i].id}/2x`,
                });
            }
        })
        .catch(console.error);

    await (
        await fetch(proxy + "https://7tv.io/v3/emote-sets/global")
    )
        .json()
        .then((data) => {
            for (let i = 0; i < data.emotes.length; i++) {
                config.emotes.push({
                    name: data.emotes[i].name,
                    url: `https://cdn.7tv.app/emote/${data.emotes[i].id}/2x.webp`,
                });
            }
        })
        .catch(console.error);

    await (
        await fetch(proxy + "https://7tv.io/v3/users/twitch/" + twitchId)
    )
        .json()
        .then((data) => {
            const emoteSet = data["emote_set"];
            if (emoteSet === null) return;
            const emotes = emoteSet["emotes"];
            for (let i = 0; i < emotes.length; i++) {
                config.emotes.push({
                    name: emotes[i].name,
                    url:
                        "https:" +
                        emotes[i].data.host.url +
                        "/" +
                        emotes[i].data.host.files[2].name,
                });
            }
        })
        .catch(console.error);

    const successMessage = `Successfully loaded ${config.emotes.length} emotes for channel ${config.channel}`;

    $("#errors").html(successMessage).delay(2000).fadeOut(300);
    console.log(successMessage, config.emotes);
};

const findEmoteInMessage = (message) => {
    for (const emote of config.emotes.map((a) => a.name)) {
        if (message.includes(emote)) {
            return emote;
        }
    }
    return null;
};

const findUrlInEmotes = (emote) => {
    for (const emoteObj of config.emotes) {
        if (emoteObj.name === emote) {
            return emoteObj.url;
        }
    }
    return null;
};

const showEmote = (message, rawMessage) => {
    if (config.showEmoteEnabled) {
        const emoteUsedPos = rawMessage[4].startsWith("emotes=") ? 4 : 5;
        const emoteUsed = rawMessage[emoteUsedPos].split("emotes=").pop();
        const splitMessage = message.split(" ");

        if (emoteUsed.length === 0) {
            const url = findUrlInEmotes(findEmoteInMessage(splitMessage));
            if (url) return showEmoteEvent(url);
        } else {
            const url = `https://static-cdn.jtvnw.net/emoticons/v2/${emoteUsed.split(":")[0]
                }/default/dark/2.0`;
            return showEmoteEvent(url);
        }
    }
};

const findEmotes = (message, rawMessage) => {
    if (config.emotes.length === 0) return;

    const emoteUsedPos = rawMessage[4].startsWith("emotes=")
        ? 4
        : rawMessage[5].startsWith("emote-only=")
            ? 6
            : 5;
    const emoteUsed = rawMessage[emoteUsedPos].split("emotes=").pop();
    const splitMessage = message.split(" ").filter((a) => !!a.length);

    if (splitMessage.includes(config.currentStreak.emote))
        config.currentStreak.streak++;
    else if (
        rawMessage[emoteUsedPos].startsWith("emotes=") &&
        emoteUsed.length > 1
    ) {
        config.currentStreak.streak = 1;
        config.currentStreak.emote = message.substring(
            parseInt(emoteUsed.split(":")[1].split("-")[0]),
            parseInt(emoteUsed.split(":")[1].split("-")[1]) + 1
        );
        config.currentStreak.url = `https://static-cdn.jtvnw.net/emoticons/v2/${emoteUsed.split(":")[0]
            }/default/dark/2.0`;
    } else {
        config.currentStreak.streak = 1;
        config.currentStreak.emote = findEmoteInMessage(splitMessage);
        config.currentStreak.url = findUrlInEmotes(config.currentStreak.emote);
    }

    streakEvent();
};

const streakEvent = () => {
    if (config.currentStreak.streak >= config.minStreak && config.streakEnabled) {
        $("#main").empty();
        $("#main").css({
            "position": "absolute",
            "display": "block"
        });

        switch (config.emoteLocation) {
            default:
            case 1: // Bottom left
                $("#main").css({
                    "bottom": "50px",
                    "left": "35px",
                    "transform": "translateX(-150%)"
                });
                break;
            case 2: // Top left
                $("#main").css({
                    "top": "50px",
                    "left": "35px",
                    "transform": "translateX(-150%)"
                });
                break;
            case 3: // Top right
                $("#main").css({
                    "top": "50px",
                    "right": "35px",
                    "transform": "translateX(150%)"
                });
                break;
            case 4: // Bottom right
                $("#main").css({
                    "bottom": "50px",
                    "right": "35px",
                    "transform": "translateX(150%)"
                });
                break;
        }

        $("<img />", { src: config.currentStreak.url }).appendTo("#main");
        $("#main")
            .append(
                " 󠀀  󠀀  x" +
                config.currentStreak.streak +
                " " +
                config.emoteStreakEndingText
            )
            .appendTo("#main");

        const tl = gsap.timeline();

        tl.to("#main", 0.8, {
            x: 0,
            ease: "elastic.out(1, 0.7)",
            onComplete: () => {
                setTimeout(() => {
                    if (config.emoteLocation === 1 || config.emoteLocation === 2) {
                        gsap.to("#main", 0.8, {
                            x: "-150%",
                            ease: "elastic.in(1, 0.7)",
                            onComplete: () => {
                                $("#main").css("display", "none");
                            }
                        });
                    } else {
                        gsap.to("#main", 0.8, {
                            x: "150%",
                            ease: "elastic.in(1, 0.7)",
                            onComplete: () => {
                                $("#main").css("display", "none");
                            }
                        });
                    }
                }, 4000);
            }
        });

        config.streakCooldown = new Date().getTime();
    }
};

const getRandomPosPercent = () => [
    Math.floor(Math.random() * 100),
    Math.floor(Math.random() * 100),
];

const showEmoteEvent = (url) => {
    const secondsDiff =
        (new Date().getTime() - new Date(config.showEmoteCooldownRef).getTime()) /
        1000;

    if (secondsDiff > config.showEmoteCooldown) {
        config.showEmoteCooldownRef = new Date();

        $("#showEmote").empty();
        const [x, y] = getRandomPosPercent();
        const emoteEl = $("#showEmote");

        emoteEl.css({
            position: "absolute", // Ensure the parent container has position: relative
            left: `${x}%`,
            top: `${y}%`,
            transform: `translate(-50%, -50%)`, // Center the emote based on its own dimensions
        });

        $("<img />", {
            src: url,
            style: `transform: scale(${config.showEmoteSizeMultiplier});`,
        }).appendTo(emoteEl);

        gsap.to("#showEmote", 1, {
            autoAlpha: 1,
            onComplete: () =>
                gsap.to("#showEmote", 1, {
                    autoAlpha: 0,
                    delay: 4,
                    onComplete: () => $("#showEmote").empty(),
                }),
        });
    }
};

const connect = () => {
    const chat = new WebSocket("wss://irc-ws.chat.twitch.tv");
    const timeout = setTimeout(() => {
        chat.close();
        chat.connect();
    }, 10000);

    chat.onopen = function () {
        clearInterval(timeout);
        chat.send(
            "CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership"
        );
        chat.send("PASS oauth:xd123");
        chat.send("NICK justinfan123");
        chat.send("JOIN #" + config.channel);
        console.log("Connected to Twitch IRC");
        getEmotes();
    };

    chat.onerror = function () {
        console.error("There was an error.. disconnected from the IRC");
        chat.close();
        chat.connect();
    };

    chat.onmessage = function (event) {
        const usedMessage = event.data.split(/\r\n/)[0];
        const textStart = usedMessage.indexOf(` `); // tag part ends at the first space
        const fullMessage = usedMessage.slice(0, textStart).split(`;`); // gets the tag part and splits the tags
        fullMessage.push(usedMessage.slice(textStart + 1));

        if (fullMessage.length > 13) {
            const parsedMessage = fullMessage[fullMessage.length - 1]
                .split(`${config.channel} :`)
                .pop(); // gets the raw message
            let message = parsedMessage.split(" ").includes("ACTION")
                ? parsedMessage.split("ACTION ").pop().split("")[0]
                : parsedMessage; // checks for the /me ACTION usage and gets the specific message
            if (
                message.toLowerCase().startsWith("!showemote") ||
                message.toLowerCase().startsWith("!#showemote")
            ) {
                showEmote(message, fullMessage);
            }
            findEmotes(message, fullMessage);
        }
        if (fullMessage.length == 2 && fullMessage[0].startsWith("PING")) {
            console.log("sending pong");
            chat.send("PONG");
        }
    };
};