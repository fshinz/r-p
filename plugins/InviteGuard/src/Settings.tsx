import { React, ReactNative } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import { findByName } from "@vendetta/metro";

// Grab Discord's native settings components
const { TableRowGroup, TableSwitchRow, TableRowIcon } = findByName("TableRowGroup")?.__proto__
  ? {}
  : (() => {
      const mod = findByName("TableRowGroup");
      return {
        TableRowGroup: mod,
        TableSwitchRow: findByName("TableSwitchRow"),
        TableRowIcon: findByName("TableRowIcon"),
      };
    })();

const { ScrollView, View, Text, TouchableOpacity, TextInput } = ReactNative;

export default function Settings() {
  useProxy(storage);
  const [inviteInput, setInviteInput] = React.useState("");

  const addAutoLurk = () => {
    if (!inviteInput.trim()) return;
    if (!storage.autoLurkGuilds) storage.autoLurkGuilds = [];
    storage.autoLurkGuilds = [...new Set([...storage.autoLurkGuilds, inviteInput.trim()])];
    setInviteInput("");
    showToast("Added to auto-lurk", getAssetIDByName("Check"));
  };

  const removeAutoLurk = (id: string) => {
    storage.autoLurkGuilds = (storage.autoLurkGuilds ?? []).filter((g: string) => g !== id);
  };

  const unblockInvite = (code: string) => {
    storage.blockedInvites = (storage.blockedInvites ?? []).filter((c: string) => c !== code);
    showToast(`Unblocked: ${code}`, getAssetIDByName("Small"));
  };

  const clearAll = () => {
    storage.autoLurkGuilds = [];
    storage.blockedInvites = [];
    showToast("Cleared all data", getAssetIDByName("Check"));
  };

  const toggles = [
    { label: "Join Button", key: "showJoinButton" },
    { label: "Lurk Button", key: "showLurkButton" },
    { label: "Info Button", key: "showInfoButton" },
    { label: "Block Button", key: "showBlockButton" },
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 38 }}>
      <View style={{ padding: 12 }}>
        {/* Toggles */}
        {toggles.map(({ label, key }) => (
          <View key={key} style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 10,
            borderBottomWidth: 0.5,
            borderBottomColor: "#3a3a3a",
          }}>
            <Text style={{ color: "#fff", fontSize: 15 }}>{label}</Text>
            <TouchableOpacity
              onPress={() => { storage[key] = !storage[key]; }}
              style={{
                width: 48,
                height: 26,
                borderRadius: 13,
                backgroundColor: storage[key] ? "#3BA55D" : "#4E5058",
                justifyContent: "center",
                paddingHorizontal: 3,
              }}
            >
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: "#fff",
                alignSelf: storage[key] ? "flex-end" : "flex-start",
              }} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Auto-Lurk */}
        <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700", marginTop: 24, marginBottom: 10 }}>
          Auto-Lurk Servers
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
          <TextInput
            style={{
              flex: 1,
              backgroundColor: "#1e1e1e",
              borderRadius: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              color: "#fff",
            }}
            placeholder="Paste invite code..."
            placeholderTextColor="#666"
            value={inviteInput}
            onChangeText={(v: string) => setInviteInput(v)}
          />
          <TouchableOpacity
            onPress={addAutoLurk}
            style={{
              backgroundColor: "#5865F2",
              paddingHorizontal: 14,
              borderRadius: 6,
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#FFF", fontWeight: "600" }}>Add</Text>
          </TouchableOpacity>
        </View>
        {(storage.autoLurkGuilds ?? []).map((id: string) => (
          <View key={id} style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 8,
            borderBottomWidth: 0.5,
            borderBottomColor: "#3a3a3a",
          }}>
            <Text style={{ flex: 1, fontSize: 14, color: "#ccc" }}>{id}</Text>
            <TouchableOpacity onPress={() => removeAutoLurk(id)} style={{
              backgroundColor: "#ED4245",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 4,
            }}>
              <Text style={{ color: "#FFF", fontSize: 12 }}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Blocked */}
        <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700", marginTop: 24, marginBottom: 10 }}>
          Blocked Invites
        </Text>
        {(storage.blockedInvites ?? []).length === 0 && (
          <Text style={{ color: "#888", fontSize: 13 }}>No blocked invites</Text>
        )}
        {(storage.blockedInvites ?? []).map((code: string) => (
          <View key={code} style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 8,
            borderBottomWidth: 0.5,
            borderBottomColor: "#3a3a3a",
          }}>
            <Text style={{ flex: 1, fontSize: 14, fontFamily: "monospace", color: "#ccc" }}>
              {code}
            </Text>
            <TouchableOpacity onPress={() => unblockInvite(code)} style={{
              backgroundColor: "#3BA55D",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 4,
            }}>
              <Text style={{ color: "#FFF", fontSize: 12 }}>Unblock</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Clear */}
        <TouchableOpacity onPress={clearAll} style={{
          backgroundColor: "#ED4245",
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 8,
          alignItems: "center",
          marginTop: 20,
        }}>
          <Text style={{ color: "#FFF", fontWeight: "700" }}>Clear All Data</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}