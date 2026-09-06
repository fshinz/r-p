import { React, stylesheet } from "@vendetta/metro/common";
import { findByProps } from "@vendetta/metro";
import { Forms } from "@vendetta/ui/components";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from "react-native";
import {
  getNotifications,
  subscribeToNotifications,
  clearAllNotifications,
} from "../notifications";
import type { NotificationCategory, NotificationItem } from "../types";

// Dynamic lookup for Discord semantic theme colors
const ColorModule = findByProps("semanticColors", "rawColors") || findByProps("ThemeColorMap");
const semanticColors = ColorModule?.semanticColors ?? ColorModule ?? {};

const ChannelNavigation = findByProps("selectChannel", "jumpToMessage");
const NavigationNative = findByProps("navigate", "push");

const CATEGORIES: { id: NotificationCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "mentions", label: "Mentions" },
  { id: "replies", label: "Replies" },
  { id: "reactions", label: "Reactions" },
  { id: "friend_request", label: "Friends" },
  { id: "threads", label: "Threads" },
  { id: "other", label: "Other" },
];

const styles = stylesheet.createThemedStyleSheet({
  container: {
    flex: 1,
    backgroundColor: semanticColors?.BACKGROUND_PRIMARY ?? "#1e1f22",
  },
  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    color: semanticColors?.HEADER_PRIMARY ?? "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
  clearText: {
    color: semanticColors?.TEXT_DANGER ?? "#f23f43",
    fontSize: 14,
    fontWeight: "600",
  },
  pillsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: semanticColors?.BACKGROUND_SECONDARY_ALT ?? "#2b2d31",
  },
  activePill: {
    backgroundColor: semanticColors?.BG_BRAND ?? "#5865f2",
  },
  pillText: {
    color: semanticColors?.INTERACTIVE_NORMAL ?? "#949ba4",
    fontSize: 13,
    fontWeight: "600",
  },
  activePillText: {
    color: "#ffffff",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  // Card styling that matches Discord's native card containers
  card: {
    backgroundColor: semanticColors?.BACKGROUND_SECONDARY ?? "#2b2d31",
    borderRadius: 12,
    marginVertical: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: semanticColors?.BACKGROUND_MODIFIER_ACCENT ?? "rgba(255, 255, 255, 0.05)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: semanticColors?.BACKGROUND_SECONDARY_ALT ?? "#1e1f22",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cardTitle: {
    color: semanticColors?.HEADER_PRIMARY ?? "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    color: semanticColors?.TEXT_MUTED ?? "#949ba4",
    fontSize: 11,
  },
  cardBody: {
    padding: 12,
  },
  cardContent: {
    color: semanticColors?.TEXT_NORMAL ?? "#dbdee1",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  cardFooter: {
    marginTop: 2,
  },
  location: {
    color: semanticColors?.TEXT_MUTED ?? "#949ba4",
    fontSize: 11,
    fontWeight: "500",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: semanticColors?.TEXT_MUTED ?? "#949ba4",
    fontSize: 14,
  },
});

export default function NotificationCenterUI() {
  const [items, setItems] = React.useState<NotificationItem[]>(getNotifications());
  const [activeTab, setActiveTab] = React.useState<NotificationCategory | "all">("all");

  React.useEffect(() => {
    return subscribeToNotifications(() => {
      setItems([...getNotifications()]);
    });
  }, []);

  const filteredItems = React.useMemo(() => {
    if (activeTab === "all") return items;
    return items.filter((item) => item.category === activeTab);
  }, [items, activeTab]);

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

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const location = item.guildName
      ? `${item.guildName} • ${item.channelName}`
      : item.channelName;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => jumpToMessage(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>

        <View style={styles.cardBody}>
          {Boolean(item.content) && (
            <Text style={styles.cardContent} numberOfLines={2}>
              {item.content}
            </Text>
          )}
          <View style={styles.cardFooter}>
            <Text style={styles.location} numberOfLines={1}>
              {location}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Notification Center</Text>
        <TouchableOpacity onPress={clearAllNotifications}>
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContainer}
        >
          {CATEGORIES.map((cat) => {
            const active = activeTab === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.pill, active && styles.activePill]}
                onPress={() => setActiveTab(cat.id as any)}
              >
                <Text style={[styles.pillText, active && styles.activePillText]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No notifications here yet</Text>
          </View>
        }
      />
    </View>
  );
}
