import { React } from "@vendetta/metro/common";
import { findByProps } from "@vendetta/metro";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";
import {
  getNotifications,
  subscribeToNotifications,
  clearAllNotifications,
} from "../notifications";
import type { NotificationCategory, NotificationItem } from "../types";

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

export function NotificationCenterUI() {
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

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => jumpToMessage(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.timestamp}>{item.timestamp}</Text>
      </View>
      {Boolean(item.content) && (
        <Text style={styles.content} numberOfLines={2}>
          {item.content}
        </Text>
      )}
      <View style={styles.cardFooter}>
        <Text style={styles.location} numberOfLines={1}>
          {item.guildName ? `${item.guildName} • ${item.channelName}` : item.channelName}
        </Text>
      </View>
    </TouchableOpacity>
  );

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1e1f22",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2b2d31",
  },
  headerTitle: {
    color: "#f2f3f5",
    fontSize: 18,
    fontWeight: "bold",
  },
  clearButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "#da373c",
  },
  clearText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: "#2b2d31",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#2b2d31",
    marginRight: 8,
  },
  activeTab: {
    backgroundColor: "#5865f2",
  },
  tabText: {
    color: "#949ba4",
    fontSize: 13,
    fontWeight: "500",
  },
  activeTabText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  listContent: {
    padding: 12,
  },
  card: {
    backgroundColor: "#2b2d31",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    color: "#f2f3f5",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    color: "#949ba4",
    fontSize: 11,
  },
  content: {
    color: "#dbdee1",
    fontSize: 13,
    marginBottom: 6,
  },
  cardFooter: {
    marginTop: 2,
  },
  location: {
    color: "#949ba4",
    fontSize: 11,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    color: "#949ba4",
    fontSize: 14,
  },
});
