import { React, ReactNative } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { showConfirmationAlert } from "@vendetta/ui/alerts";
import { Forms } from "@vendetta/ui/components";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { findByStoreName, findByProps } from "@vendetta/metro";

let UserStore: any;
let UncachedUserManager: any;
let Profiles: any;

export default () => {
  UserStore ??= findByStoreName("UserStore");
  UncachedUserManager ??= findByProps("fetchProfile", "getUser", "setFlag");
  Profiles ??= findByProps("showUserProfile");

  async function openProfile(userId: string) {
    const show = Profiles?.showUserProfile;
    if (!show) return;

    if (UserStore.getUser(userId)) {
      show({ userId });
    } else {
      UncachedUserManager.getUser(userId).then(({ id }: { id: string }) => show({ userId: id }));
    }
  }

  useProxy(storage);
  const users: string[] = storage.ignore.users ?? [];

  const handleRemoveUser = (userId: string) => {
    storage.ignore.users = users.filter((id) => id !== userId);
  };

  const handleClearUsers = () => {
    storage.ignore.users = [];
  };

  return (
    <ReactNative.ScrollView style={{ flex: 1 }}>
      <Forms.FormSection title="Settings" titleStyleType="no_border">
        <Forms.FormRow 
          label="Show Timestamps" 
          trailing={
            <Forms.FormSwitch 
              value={storage.timestamps} 
              onValueChange={(v: boolean) => (storage.timestamps = v)} 
            />
          } 
        />
        <Forms.FormRow 
          label="12-Hour Format" 
          trailing={
            <Forms.FormSwitch 
              value={storage.ew} 
              onValueChange={(v: boolean) => (storage.ew = v)} 
            />
          } 
        />
        <Forms.FormDivider />
        <Forms.FormRow label="Deleted messages display an Automod indicator." />
      </Forms.FormSection>

      <Forms.FormSection title="Filters">
        <Forms.FormRow 
          label="Ignore Bots" 
          trailing={
            <Forms.FormSwitch 
              value={storage.ignore.bots} 
              onValueChange={(value: boolean) => (storage.ignore.bots = value)} 
            />
          } 
        />
        <Forms.FormRow
          label={`Clear Ignored Users (${users.length})`}
          trailing={<Forms.FormRow.Icon source={getAssetIDByName("ic_trash_24px")} />}
          onPress={() => {
            if (users.length > 0) {
              showConfirmationAlert({
                title: "Clear Ignored Users",
                content: `Are you sure you want to clear ${users.length} ignored user(s)?`,
                confirmText: "Yes",
                cancelText: "No",
                confirmColor: "brand",
                onConfirm: handleClearUsers,
              });
            }
          }}
        />

        <ReactNative.ScrollView style={{ flex: 1, marginLeft: 15 }}>
          {users.map((id) => {
            const user = UserStore.getUser(id) ?? {};
            const pfp = user?.getAvatarURL?.(null, 26)?.replace?.(/\.(gif|webp)/, ".png") 
                        || "https://cdn.discordapp.com/embed/avatars/1.png?size=48";

            const username = user.username 
              ? `${user.username}${user.discriminator && user.discriminator !== "0" ? `#${user.discriminator}` : ""}`
              : `${id} (Uncached)`;

            return (
              <Forms.FormRow
                key={id}
                label={username}
                leading={<Forms.FormRow.Icon source={{ uri: pfp }} />}
                trailing={<Forms.FormRow.Icon source={getAssetIDByName("ic_close_24px")} />}
                onPress={() => openProfile(id)}
                onTrailingPress={() => handleRemoveUser(id)}
              />
            );
          })}
        </ReactNative.ScrollView>
        <Forms.FormDivider />
        <Forms.FormRow label="Long-press a user profile sheet to ignore/unignore them." />
      </Forms.FormSection>
    </ReactNative.ScrollView>
  );
};
