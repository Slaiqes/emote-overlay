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
gsap.defaults({ overwrite: "auto", force3D: true });

// --- FIX: show "invalid channel" helper + show-on-load ---
function showInvalidChannel() {
    $("#errors").html(
        `Invalid channel. Please enter a channel name in the URL. Example: https://emote.slaiqe.com/?channel=forsen`
    ).show();
}
$(function () {
    if (!config.channel) showInvalidChannel();
});
function getTransformOriginForCorner(loc) {
    switch (loc) {
        case 1: return "left top";     // top-left
        case 2: return "left bottom";  // bottom-left
        case 3: return "right bottom"; // bottom-right
        case 4: return "right top";    // top-right
        default: return "left top";
    }
}
// ---- NEW: slide-in/out state ----
let streakHideTimeout = null;
let streakShown = false;

// Margin from each screen edge in px (tweak with ?edgeMargin=NN)
const EDGE_MARGIN = Number(url.searchParams.get("edgeMargin") || 32);
// How far off-screen (px) the streak slides from/to
const SLIDE_OFFSET = Number(url.searchParams.get("slideOffset") || 320);
// Idle time (ms) before sliding out
const IDLE_BEFORE_HIDE = Number(url.searchParams.get("streakIdleMs") || 2000);

// ---------- Corner placement + motion (horizontal slide) ----------
function getCornerPlacement(emoteLocation) {
    // We’ll slide horizontally “on the same line” as the badge/emote.
    // Left corners slide in from LEFT (negative X), right corners from RIGHT (positive X).
    switch (emoteLocation) {
        case 1: // top-left
            return {
                css: { position: "fixed", top: EDGE_MARGIN, left: EDGE_MARGIN - 20 },
                axis: "x",
                dir: -1,
            };
        case 2: // bottom-left
            return {
                css: { position: "fixed", bottom: EDGE_MARGIN - 20, left: EDGE_MARGIN - 20 },
                axis: "x",
                dir: -1,
            };
        case 3: // bottom-right
            return {
                css: { position: "fixed", bottom: EDGE_MARGIN - 20, right: EDGE_MARGIN - 20 },
                axis: "x",
                dir: 1,
            };
        case 4: // top-right
            return {
                css: { position: "fixed", top: EDGE_MARGIN, right: EDGE_MARGIN - 20 },
                axis: "x",
                dir: 1,
            };
        default: // fallback to top-left
            return {
                css: { position: "fixed", top: EDGE_MARGIN, left: EDGE_MARGIN - 20 },
                axis: "x",
                dir: -1,
            };
    }
}

// Mount/position #main in the chosen corner (true corners for OBS)
function ensureMainMounted() {
    const $main = $("#main");
    $main.empty();
    const place = getCornerPlacement(config.emoteLocation);

    // Reset all edges, then apply the specific corner
    $main.css({
        top: "", right: "", bottom: "", left: "",
        ...place.css,
        display: "inline-flex",
        alignItems: "flex-end",
        gap: "10px",
        fontWeight: "bold",
        transformOrigin: "center",
        zIndex: 999999,        // keep above everything
        pointerEvents: "none", // overlay shouldn't block clicks
    });

    return { $main, place };
}

// ---------------------------------------------------------------

const getEmotes = async () => {
    // const proxy = "https://tpbcors.herokuapp.com/";
    const proxy = "https://api.roaringiron.com/proxy/";
    console.log(config);

    if (!config.channel) {
        return $("#errors").html(
            `Invalid channel. Please enter a channel name in the URL. Example: https://emote.slaiqe.com/?channel=forsen`
        );
    }

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
    const parts = Array.isArray(message) ? message : String(message).split(" ");
    for (const emote of config.emotes.map((a) => a.name)) {
        if (parts.includes(emote)) return emote;
    }
    return null;
};

const findUrlInEmotes = (emote) => {
    for (const emoteObj of config.emotes) {
        if (emoteObj.name === emote) return emoteObj.url;
    }
    return null;
};

const showEmote = (message, rawMessage) => {
    if (!config.showEmoteEnabled) return;

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

// ---- slide horizontally, bump on increase, slide out on idle ----
const streakEvent = () => {
    if (!(config.currentStreak.streak >= config.minStreak && config.streakEnabled)) return;

    const firstShow = !streakShown;

    const { $main, place } = ensureMainMounted();

    // ✅ Build content in this order: [amount] [emote] [text]
    // Keep "original" feel by using plain text nodes (no extra wrappers/styles).
    $main.empty();
    $main.append("x" + config.currentStreak.streak + " ");     // streak amount
    $("<img />", {
        src: config.currentStreak.url,
        css: { marginBottom: "3px" }   // 👈 nudges emote up
    }).appendTo($main); // emote image
    $main.append(" " + config.emoteStreakEndingText);          // trailing text (e.g., "streak!")

    // Slide in horizontally along same baseline
    const offset = place.dir * SLIDE_OFFSET;
    gsap.set($main, { scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, transformOrigin: getTransformOriginForCorner(config.emoteLocation) });

    if (firstShow) {
        streakShown = true;
        gsap.set($main, { autoAlpha: 0, x: offset, y: 0 });
        gsap.to($main, {
            duration: 0.4,
            autoAlpha: 1,
            x: 0, y: 0,
            ease: "power3.out",
            onComplete: () => {
                gsap.fromTo($main, { scaleX: 0.96 }, { duration: 0.12, scaleX: 1, ease: "power1.out" });
            }
        });
    } else {
        // Bump the emote only
        const $img = $("#main img").first();
        gsap.fromTo($img, { scale: 1 }, { duration: 0.15, scale: 1.25, yoyo: true, repeat: 1, ease: "power1.out" });

        // Subtle badge pulse
        gsap.fromTo($main, { scale: 1 }, { duration: 0.12, scale: 1.05, yoyo: true, repeat: 1 });
    }

    // Reset hide timer
    if (streakHideTimeout) clearTimeout(streakHideTimeout);
    streakHideTimeout = setTimeout(() => {
        const $now = $("#main");
        const offset = place.dir * SLIDE_OFFSET;

        gsap.killTweensOf($now);
        gsap.killTweensOf("#main img");

        gsap.set($now, {
            willChange: "transform",
            force3D: true,
            transformOrigin: getTransformOriginForCorner(config.emoteLocation),
            scaleX: 1, scaleY: 1,
            autoAlpha: 1,
            opacity: 1,
            visibility: "visible"
        });

        const DURATION = 0.44;
        const STRETCH_PEAK = 0.22;
        const END_COMPRESS = 0.26;

        gsap.to($now, {
            duration: DURATION,
            x: offset,
            ease: "expo.in",
            overwrite: "auto",
            onUpdate: function () {
                const t = this.progress();

                const scaleX = 1 + STRETCH_PEAK * Math.sin(Math.PI * t) - END_COMPRESS * t;
                gsap.set($now, { scaleX });
            },
            onComplete: () => {
                $now.empty();
                gsap.set($now, { clearProps: "all" });
                streakShown = false;
            }
        });
    }, IDLE_BEFORE_HIDE);
};


// ---- unchanged: random emote pop on screen ----
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
            position: "absolute",
            left: `${x}%`,
            top: `${y}%`,
            transform: `translate(-50%, -50%)`,
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

// ---- WebSocket connect (with simple auto-retry) ----
let ws = null;
let reconnectTimer = null;

function openSocket() {
    // --- FIX: show invalid channel here too (socket path) ---
    if (!config.channel) {
        showInvalidChannel();
        return;
    }
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

    ws = new WebSocket("wss://irc-ws.chat.twitch.tv");

    ws.onopen = function () {
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
        ws.send("CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership");
        ws.send("PASS oauth:xd123");
        ws.send("NICK justinfan123");
        ws.send("JOIN #" + config.channel);
        console.log("Connected to Twitch IRC");
        getEmotes();
    };

    ws.onerror = function (e) {
        console.error("IRC error:", e);
        try { ws.close(); } catch (_) { }
    };

    ws.onclose = function () {
        reconnectTimer = setTimeout(openSocket, 3000);
    };

    ws.onmessage = function (event) {
        const usedMessage = event.data.split(/\r\n/)[0];
        const textStart = usedMessage.indexOf(` `);
        const fullMessage = usedMessage.slice(0, textStart).split(`;`);
        fullMessage.push(usedMessage.slice(textStart + 1));

        if (fullMessage.length > 13) {
            const parsedMessage = fullMessage[fullMessage.length - 1]
                .split(`${config.channel} :`)
                .pop();
            let message = parsedMessage.split(" ").includes("ACTION")
                ? parsedMessage.split("ACTION ").pop().split("")[0]
                : parsedMessage;

            if (
                message.toLowerCase().startsWith("!showemote") ||
                message.toLowerCase().startsWith("!#showemote")
            ) {
                showEmote(message, fullMessage);
            }
            findEmotes(message, fullMessage);
        }
        if (fullMessage.length === 2 && fullMessage[0].startsWith("PING")) {
            ws.send("PONG");
        }
    };
}

const connect = () => {
    openSocket();
};
