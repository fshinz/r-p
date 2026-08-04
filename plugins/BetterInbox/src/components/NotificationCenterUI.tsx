import { React, stylesheet } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { ScrollView, View, Text, TouchableOpacity, Image } from "react-native";
import type { LocalStorage, NotificationItem } from "../types";

const pluginStorage = (storage as LocalStorage) || { notifications: [] };

export default function NotificationCenterUI() {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>(
    pluginStorage.notifications || []
  );

  // Keep state updated when storage changes
  React.useEffect(() => {
    const interval = setInterval(() => {
      setNotifications([...(pluginStorage.notifications || [])]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const clearNotifications = () => {
    pluginStorage.notifications = [];
    setNotifications([]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Better Inbox</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={clearNotifications} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No notifications yet!</Text>
        </View>
      ) : (
        notifications.map((item) => {
          const avatarUrl = item.author?.avatar
            ? `https://cdn.discordapp.com/avatars/${item.author.id}/${item.author.avatar}.png`
            : "https://cdn.discordapp.com/embed/avatars/0.png";

          return (
            <View key={item.id} style={styles.card}>
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.authorName}>
                    {item.author?.globalName || item.author?.username || "Someone"}
                  </Text>
                  <Text style={styles.timestamp}>{item.timestamp}</Text>
                </View>
                <Text style={styles.title}>{item.title}</Text>
                {Boolean(item.content) && (
                  <Text style={styles.messageContent} numberOfLines={2}>
                    {item.content}
                  </Text>
                )}
                <Text style={styles.locationText}>
                  {item.guildName} • {item.channelName}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = stylesheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1e1f22",
    padding: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  clearButton: {
    backgroundColor: "#da373c",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  clearButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#949ba4",
    fontSize: 14,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#2b2d31",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  authorName: {
    color: "#f2f3f5",
    fontWeight: "bold",
    fontSize: 14,
  },
  timestamp: {
    color: "#949ba4",
    fontSize: 11,
  },
  title: {
    color: "#dbdee1",
    fontSize: 13,
    marginBottom: 4,
  },
  messageContent: {
    color: "#949ba4",
    fontSize: 12,
    marginBottom: 4,
  },
  locationText: {
    color: "#80848e",
    fontSize: 11,
  },
});
