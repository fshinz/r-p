import { storage } from "@vendetta/plugin";
import { showToast } from "@vendetta/ui/toasts";
import { findByProps } from "@vendetta/metro";

const { ScrollView, Text, View, TouchableOpacity, TextInput, FlatList } =
  findByProps("ScrollView", "FlatList") ?? {};
const { FormRow, FormSection, FormInput, FormSwitch, FormDivider } =
  findByProps("FormRow", "FormSection") ?? {};
const { styles, createStyles } = findByProps("styles", "createStyles") ?? {};

export default () => {
  const [inviteInput, setInviteInput] = React.useState("");
  const [blocked, setBlocked] = React.useState(storage.blockedInvites ?? []);
  const [lurked, setLurked] = React.useState(storage.quickJoinGuilds ?? []);
  const [, forceUpdate] = React.useState(0);

  const refresh = () => {
    setBlocked(storage.blockedInvites ?? []);
    setLurked(storage.quickJoinGuilds ?? []);
    forceUpdate((n) => n + 1);
  };

  const addGuildToLurk = () => {
    if (!inviteInput.trim()) return;
    if (!storage.quickJoinGuilds) storage.quickJoinGuilds = [];
    storage.quickJoinGuilds = [...new Set([...storage.quickJoinGuilds, inviteInput.trim()])];
    setInviteInput("");
    refresh();
    showToast("Added to auto-lurk list", "Check");
  };

  const removeFromLurk = (guildId: string) => {
    storage.quickJoinGuilds = (storage.quickJoinGuilds ?? []).filter((g: string) => g !== guildId);
    refresh();
  };

  const unblockInvite = (code: string) => {
    storage.blockedInvites = (storage.blockedInvites ?? []).filter((c: string) => c !== code);
    refresh();
    showToast(`Unblocked: ${code}`, "Small");
  };

  const clearAll = () => {
    storage.quickJoinGuilds = [];
    storage.blockedInvites = [];
    refresh();
    showToast("Cleared all data", "Check");
  };

  return (
    <ScrollView style={{ flex: 1, padding: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 12 }}>
        🛡️ InviteGuard Settings
      </Text>

      {/* ─── Auto-Lurk section ─── */}
      <FormSection title="Auto-Lurk Guilds">
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <FormInput
              placeholder="Paste invite code (e.g. discordgg)"
              value={inviteInput}
              onChange={(v: string) => setInviteInput(v)}
            />
          </View>
          <TouchableOpacity
            onPress={addGuildToLurk}
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

        {lurked.length === 0 && (
          <Text style={{ color: "#999", fontSize: 13, paddingVertical: 8 }}>
            No guilds in auto-lurk list
          </Text>
        )}

        {lurked.map((id: string) => (
          <View
            key={id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 8,
              borderBottomWidth: 0.5,
              borderBottomColor: "#3a3a3a",
            }}
          >
            <Text style={{ flex: 1, fontSize: 14 }}>{id}</Text>
            <TouchableOpacity
              onPress={() => removeFromLurk(id)}
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
      </FormSection>

      <FormDivider />

      {/* ─── Blocked Invites section ─── */}
      <FormSection title="Blocked Invites">
        {blocked.length === 0 && (
          <Text style={{ color: "#999", fontSize: 13, paddingVertical: 8 }}>
            No blocked invites
          </Text>
        )}

        {blocked.map((code: string) => (
          <View
            key={code}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 8,
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
      </FormSection>

      <FormDivider />

      {/* ─── Danger zone ─── */}
      <View style={{ marginTop: 16, alignItems: "center" }}>
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
    </ScrollView>
  );
};
