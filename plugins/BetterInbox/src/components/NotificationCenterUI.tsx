import { React, stylesheet } from "@vendetta/metro/common";
import { findByProps } from "@vendetta/metro";
import { resolveSemanticColor } from "@vendetta/ui/colors";
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
  clearNotificationsByCategory,
} from "../notifications";
import type { NotificationCategory, NotificationItem } from "../types";

const ColorModule = findByProps("semanticColors", "rawColors") || findByProps("ThemeColorMap");
const semanticColors = ColorModule?.semanticColors ?? {};
const rawColors = ColorModule?.rawColors ?? {};

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

// Helper to reliably resolve colors with explicit AMOLED/dark fallbacks
const getColor = (semanticKey: string, fallback: string) => {
  try {
    if (semanticColors[semanticKey]) {
      return resolveSemanticColor(semanticColors[semanticKey]) || fallback;
    }
  } catch {}
  return fallback;
};

const styles = stylesheet.createThemedStyleSheet({
  container: {
    flex: 1,
    backgroundColor: getColor("BACKGROUND_PRIMARY", "#111214"),
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
    color: getColor("HEADER_PRIMARY", "#F2F3F5"),
    fontSize: 20,
    fontWeight: "700",
  },
  clearText: {
    color: getColor("TEXT_DANGER", "#F23F43"),
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
    backgroundColor: getColor("BACKGROUND_SECONDARY_ALT", "#2B2D31"),
  },
  activePill: {
    backgroundColor: getColor("BG_BRAND", "#5865F2"),
  },
  pillText: {
    color: getColor("INTERACTIVE_NORMAL", "#949BA4"),
    fontSize: 13,
    fontWeight: "600",
  },
  activePillText: {
    color: "#FFFFFF",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: getColor("BACKGROUND_SECONDARY", "#1E1F22"),
    borderRadius: 12,
    marginVertical: 5,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: getColor("BACKGROUND_MODIFIER_ACCENT", "rgba(255, 255, 255, 0.12)"),
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: getColor("BACKGROUND_SECONDARY_ALT", "#2B2D31"),
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cardTitle: {
    color: getColor("HEADER_PRIMARY", "#FFFFFF"),
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    color: getColor("TEXT_MUTED", "#B5BAC1"),
    fontSize: 11,
  },
  cardBody: {
    padding: 12,
  },
  cardContent: {
    color: getColor("TEXT_NORMAL", "#DBDEE1"),
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  cardFooter: {
    marginTop: 2,
  },
  location: {
    color: getColor("TEXT_MUTED", "#B5BAC1"),
    fontSize: 11,
    fontWeight: "600",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: getColor("TEXT_MUTED", "#B5BAC1"),
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

  const handleClear = () => {
    clearNotificationsByCategory(activeTab);
  };

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

  const activeLabel = CATEGORIES.find((c) => c.id === activeTab)?.label ?? "";

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Notification Center</Text>
        {filteredItems.length > 0 && (
          <TouchableOpacity onPress={handleClear}>
            <Text style={styles.clearText}>
              {activeTab === "all" ? "Clear All" : `Clear ${activeLabel}`}
            </Text>
          </TouchableOpacity>
        )}
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
