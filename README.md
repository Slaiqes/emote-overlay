# Emote Overlay (Tweaked)

An overlay that shows **emote streaks** on stream and also allows viewers to trigger emotes to appear randomly on screen.  

- Emote streaks appear in a chosen corner when multiple chatters spam the same emote.  
- Chatters can use the command `!showemote emoteName` to pop emotes randomly on screen.  
- Works with Twitch, FFZ, BTTV, and 7TV emotes.  
- *This overlay is designed for streaming software like OBS.*  

This project is based on [jahaanjain/Emote-Overlay](https://github.com/jahaanjain/Emote-Overlay) — shoutout to them 🙌.  
I made some tweaks to animations, streak display, and positioning to improve how it looks in OBS.

## Live Version
You can use the hosted version directly in OBS by adding it as a **Browser Source** (1920x1080, 60 FPS):

### https://emote.slaiqe.com/?channel=yourtwitchname
Example:  https://emote.slaiqe.com/?channel=forsen

Scroll further down to see all the customizable parameters.

---

## Usage & Parameters

You can customize behavior with **URL parameters**.  
### Format:  https://emote.slaiqe.com/?channel=yourtwitchname&parameter=value

Example:  https://emote.slaiqe.com/emoteoverlay?channel=forsen&minStreak=10&showEmoteSizeMultiplier=3

---

### Required Parameter
- `channel=yourtwitchname`  
  The Twitch channel name to connect to.

---

### Optional Parameters

- `minStreak` = *(number)*  
  Minimum emote streak needed to show up in overlay.  
  Defaults to **5** (minimum allowed = 3).

- `streakEnabled` = *(1 or 0)*  
  Enable/disable streak overlay.  
  Defaults to **1**.

- `emoteLocation` = *(1–4)*  
  Sets the streak overlay position:  
  - `1` = Top Left  
  - `2` = Bottom Left  
  - `3` = Bottom Right  
  - `4` = Top Right  
  Defaults to **1**.

- `edgeMargin` = *(number)*  
  Distance from the screen edge in pixels.  
  Defaults to **32**.

- `bottomOffset` = *(number)*  
  Extra downward shift for bottom corners.  
  Defaults to **0**.

- `slideOffset` = *(number)*  
  How far off-screen (px) the streak slides from/to.  
  Defaults to **320**.

- `streakIdleMs` = *(milliseconds)*  
  How long before the streak overlay slides out.  
  Defaults to **2000**.

- `emoteStreakText` = *(text)*  
  Ending text for the emote streak.  
  Example: `emoteStreakText=Hype!` → `x5 PogChamp Hype!`  
  For no text, leave it empty: `emoteStreakText=`.  
  Defaults to `streak!`.

---

### Random Emote Pop Parameters

- `showEmoteEnabled` = *(1 or 0)*  
  Enable/disable the `!showemote` feature.  
  Defaults to **1**.

- `showEmoteCooldown` = *(seconds)*  
  Cooldown between `!showemote` uses.  
  Defaults to **6**.

- `showEmoteSizeMultiplier` = *(number)*  
  Scale factor for emotes that pop randomly.  
  Defaults to **1**.


## Credits
- Original project: [jahaanjain/Emote-Overlay](https://github.com/jahaanjain/Emote-Overlay)  
