import { components, React, ReactNative } from "@revenge-mod/metro/common";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import { GuildActions } from "./patches/InviteEmbedButton";

const { TableRowGroup, TableSwitchRow, TableRowIcon, Stack } = components;
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

  const buttonOptions = [
    { label: "Join Button", icon: "JoinIcon", key: "showJoinButton" },
    { label: "Lurk Button", icon: "EyeIcon", key: "showLurkButton" },
    { label: "Info Button", icon: "InfoIcon", key: "showInfoButton" },
    { label: "Block Button", icon: "XSmallIcon", key: "showBlockButton" },
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 38 }}>
      <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={24}>
        {/* ─── Button visibility toggles ─── */}
        <TableRowGroup title="Button Visibility">
          {buttonOptions.map(({ label, icon, key }) =>
            TableSwitchRow ? (
              <TableSwitchRow
                key={key}
                label={label}
                icon={
                  TableRowIcon ? (
                    <TableRowIcon source={getAssetIDByName(icon)!} />
                  ) : null
                }
                value={storage[key] ?? true}
                onValueChange={(v: boolean) => {
                  storage[key] = v;
                }}
              />
            ) : null,
          )}
        </TableRowGroup>

        {/* ─── Auto-lurk list ─── */}
        <TableRowGroup title="Auto-Lurk Servers">
          <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 12, marginBottom: 8 }}>
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
            <View
              key={id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderBottomWidth: 0.5,
                borderBottomColor: "#3a3a3a",
              }}
            >
              <Text style={{ flex: 1, fontSize: 14 }}>{id}</Text>
              <TouchableOpacity
                onPress={() => removeAutoLurk(id)}
                style={{
                  backgroundColor: "#ED4245",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 4,
                }}
              >
                <Text style={{ color: "#FFF", fontSize: 12 }}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </TableRowGroup>

        {/* ─── Blocked invites ─── */}
        <TableRowGroup title="Blocked Invites">
          {(storage.blockedInvites ?? []).length === 0 && (
            <Text style={{ color: "#999", fontSize: 13, padding: 12 }}>
              No blocked invites
            </Text>
          )}
          {(storage.blockedInvites ?? []).map((code: string) => (
            <View
              key={code}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderBottomWidth: 0.5,
                borderBottomColor: "#3a3a3a",
              }}
            >
              <Text style={{ flex: 1, fontSize: 14, fontFamily: "monospace" }}>
                {code}
              </Text>
              <TouchableOpacity
                onPress={() => unblockInvite(code)}
                style={{
                  backgroundColor: "#3BA55D",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 4,
                }}
              >
                <Text style={{ color: "#FFF", fontSize: 12 }}>Unblock</Text>
              </TouchableOpacity>
            </View>
          ))}
        </TableRowGroup>

        {/* ─── Clear all ─── */}
        <View style={{ alignItems: "center", marginTop: 8 }}>
          <TouchableOpacity
            onPress={clearAll}
            style={{
              backgroundColor: "#ED4245",
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#FFF", fontWeight: "700" }}>Clear All Data</Text>
          </TouchableOpacity>
        </View>
      </Stack>
    </ScrollView>
  );
}
