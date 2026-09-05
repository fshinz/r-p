import { React, stylesheet } from "@vendetta/metro/common";
import { findByProps } from "@vendetta/metro";
import { Forms } from "@vendetta/ui/components";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
} from "react-native";
import {
  getNotifications,
  subscribeToNotifications,
  clearAllNotifications,
} from "../notifications";
import type { NotificationCategory, NotificationItem } from "../types";

const { FormRow, FormDivider } = Forms;

// Fallback lookup for Theme / Semantic Colors across Vendetta, Revenge, and Pyoncord
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: semanticColors?.BACKGROUND_MODIFIER_ACCENT ?? "#2b2d31",
  },
  headerTitle: {
    color: semanticColors?.HEADER_PRIMARY ?? "#f2f3f5",
    fontSize: 18,
    fontWeight: "bold",
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: semanticColors?.STATUS_DANGER_BACKGROUND ?? "#da373c",
  },
  clearText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: semanticColors?.BACKGROUND_MODIFIER_ACCENT ?? "#2b2d31",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: semanticColors?.BACKGROUND_SECONDARY ?? "#2b2d31",
    marginRight: 8,
  },
  activeTab: {
    backgroundColor: semanticColors?.BG_BRAND ?? "#5865f2",
  },
  tabText: {
    color: semanticColors?.INTERACTIVE_MUTED ?? "#949ba4",
    fontSize: 13,
    fontWeight: "500",
  },
  activeTabText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  cardTitle: {
    color: semanticColors?.HEADER_PRIMARY ?? "#f2f3f5",
    fontSize: 14,
    fontWeight: "600",
  },
  cardSubLabel: {
    color: semanticColors?.TEXT_MUTED ?? "#949ba4",
    fontSize: 12,
    marginTop: 2,
  },
  timestamp: {
    color: semanticColors?.TEXT_MUTED ?? "#949ba4",
    fontSize: 11,
  },
  emptyContainer: {
    padding: 32,
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
      <FormRow
        label={<Text style={styles.cardTitle}>{item.title}</Text>}
        subLabel={
          <View>
            {Boolean(item.content) && (
              <Text style={styles.cardSubLabel} numberOfLines={2}>
                {item.content}
              </Text>
            )}
            <Text style={styles.cardSubLabel} numberOfLines={1}>
              {location}
            </Text>
          </View>
        }
        trailing={<Text style={styles.timestamp}>{item.timestamp}</Text>}
        onPress={() => jumpToMessage(item)}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.headerTitle}>Notification Center</Text>
        <TouchableOpacity style={styles.clearButton} onPress={clearAllNotifications}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(cat) => cat.id}
          renderItem={({ item: cat }) => {
            const active = activeTab === cat.id;
            return (
              <TouchableOpacity
                style={[styles.tab, active && styles.activeTab]}
                onPress={() => setActiveTab(cat.id as any)}
              >
                <Text style={[styles.tabText, active && styles.activeTabText]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <FormDivider />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No notifications here yet</Text>
          </View>
        }
      />
    </View>
  );
}
