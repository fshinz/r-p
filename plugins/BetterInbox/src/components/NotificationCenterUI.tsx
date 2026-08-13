const ChannelNavigation = findByProps("selectChannel", "jumpToMessage");
const NavigationNative = findByProps("navigate", "push");

const jumpToMessage = (item: NotificationItem) => {
  if (!item.channelId) return;
  try {
    if (typeof ChannelNavigation?.jumpToMessage === "function") {
      ChannelNavigation.jumpToMessage({
        channelId: item.channelId,
        messageId: item.messageId,
      });
    } else if (typeof ChannelNavigation?.selectChannel === "function") {
      ChannelNavigation.selectChannel({
        guildId: item.guildId || "@me",
        channelId: item.channelId,
      });
    } else if (typeof NavigationNative?.navigate === "function") {
      NavigationNative.navigate("Channel", {
        guildId: item.guildId || "@me",
        channelId: item.channelId,
        messageId: item.messageId,
      });
    }
  } catch (err) {
    console.error("[BetterInbox] Deep-link error:", err);
  }
};
