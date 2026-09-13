import { React, ReactNative as RN } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { findByProps } from "@vendetta/metro";
import { showToast } from "@vendetta/ui/toasts";
import { useProxy } from "@vendetta/storage";
import { getAssetIDByName } from "@vendetta/ui/assets";

const { ScrollView } = findByProps("ScrollView");
const { TableRowGroup, TableRow, TableSwitchRow, Stack, TextInput } = findByProps(
  "TableSwitchRow",
  "TableRowGroup",
  "Stack",
  "TableRow"
);

export interface CustomBadge {
  id: string;
  description: string;
  iconUrl: string;
  link?: string;
  enabled: boolean;
}

// Ensure storage is initialized cleanly
if (Array.isArray(storage.customBadges)) {
  storage.customBadges = storage.customBadges.map((b: any) => ({
    ...b,
    enabled: typeof b.enabled === "boolean" ? b.enabled : true,
  }));
} else {
  storage.customBadges = [
    {
      id: "badge_godmode",
      description: "Supreme System Administrator",
      iconUrl: "https://i.imgur.com/6X2pY1B.png",
      link: "https://github.com",
      enabled: true,
    },
  ];
}

export default function Settings() {
  useProxy(storage);

  const [id, setId] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [iconUrl, setIconUrl] = React.useState("");
  const [link, setLink] = React.useState("");

  const addBadge = () => {
    const trimmedId = id.trim();
    const trimmedIcon = iconUrl.trim();

    if (!trimmedId || !trimmedIcon) {
      showToast("ID and Icon URL/Hash are required!", getAssetIDByName("Small"));
      return;
    }

    const exists = storage.customBadges.some((b: CustomBadge) => b.id === trimmedId);
    if (exists) {
      showToast("Badge ID already exists!", getAssetIDByName("Warning"));
      return;
    }

    const newBadge: CustomBadge = {
      id: trimmedId,
      description: description.trim() || "Custom Badge",
      iconUrl: trimmedIcon,
      ...(link.trim() ? { link: link.trim() } : {}),
      enabled: true,
    };

    storage.customBadges = [...storage.customBadges, newBadge];

    setId("");
    setDescription("");
    setIconUrl("");
    setLink("");

    showToast("Badge added successfully!", getAssetIDByName("Check"));
  };

  const toggleBadge = (badgeId: string) => {
    storage.customBadges = storage.customBadges.map((b: CustomBadge) =>
      b.id === badgeId ? { ...b, enabled: !b.enabled } : b
    );
  };

  const removeBadge = (badgeId: string) => {
    storage.customBadges = storage.customBadges.filter((b: CustomBadge) => b.id !== badgeId);
    showToast("Badge removed", getAssetIDByName("Check"));
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10 }}>
      <Stack spacing={8}>
        <TableRowGroup title="Custom Badges">
          <TableRow
            label="Profile Badge Injector"
            subLabel="Add, toggle, or remove custom profile badges in client view."
          />
        </TableRowGroup>

        <TableRowGroup title="Add New Badge">
          <Stack spacing={4}>
            <TextInput
              placeholder="Badge ID (e.g., custom_dev)"
              value={id}
              onChange={setId}
            />
            <TextInput
              placeholder="Icon URL or CDN Hash (e.g., 5e74e9b6... or http://...)"
              value={iconUrl}
              onChange={setIconUrl}
            />
            <TextInput
              placeholder="Description (Hover text)"
              value={description}
              onChange={setDescription}
            />
            <TextInput
              placeholder="Click Link (Optional)"
              value={link}
              onChange={setLink}
            />
          </Stack>
        </TableRowGroup>

        <TableRowGroup>
          <TableRow
            label="Save Badge"
            subLabel="Add this badge to your profile list"
            trailing={<TableRow.Arrow />}
            onPress={addBadge}
          />
        </TableRowGroup>

        {storage.customBadges && storage.customBadges.length > 0 && (
          <TableRowGroup title="Your Badges (Toggle to Enable/Disable)">
            {storage.customBadges.map((badge: CustomBadge) => {
              const isWebUrl = badge.iconUrl.startsWith("http://") || badge.iconUrl.startsWith("https://");
              const imageSource = isWebUrl
                ? { uri: badge.iconUrl }
                : { uri: `https://cdn.discordapp.com/badge-icons/${badge.iconUrl}.png` };

              return (
                <TableSwitchRow
                  key={badge.id}
                  label={badge.description || badge.id}
                  subLabel={`ID: ${badge.id}${badge.link ? " • Has Link" : ""}`}
                  value={badge.enabled}
                  onValueChange={() => toggleBadge(badge.id)}
                  icon={
                    <RN.Image
                      source={imageSource}
                      style={{ width: 24, height: 24, borderRadius: 4, marginRight: 8 }}
                    />
                  }
                  trailing={
                    <RN.TouchableOpacity
                      onPress={() => removeBadge(badge.id)}
                      style={{ paddingLeft: 10 }}
                    >
                      <RN.Image
                        source={getAssetIDByName("TrashIcon")}
                        style={{ width: 20, height: 20, tintColor: "#ff4d4d" }}
                      />
                    </RN.TouchableOpacity>
                  }
                />
              );
            })}
          </TableRowGroup>
        )}
      </Stack>
    </ScrollView>
  );
}
