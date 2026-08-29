import React from "react";
import { ScrollView } from "react-native";
import { findByStoreName } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import { showConfirmationAlert } from "@vendetta/ui/alerts";
import { Forms } from "@vendetta/ui/components";

const { FormSection, FormRow, FormSwitchRow, FormText } = Forms;

let UserStore: any;

export default function Settings() {
  UserStore ??= findByStoreName("UserStore");
  useProxy(storage);

  storage.ignore ??= { users: [], bots: false, ownMessages: false };
  const [users, setUsers] = React.useState<string[]>(storage.ignore.users || []);

  const handleRemoveUser = (userId: string) => {
    const newArr = users.filter((id: string) => id !== userId);
    storage.ignore.users = newArr;
    setUsers(newArr);
    showToast("User removed from ignore list", getAssetIDByName("Check"));
  };

  const handleClearUsers = () => {
    if (users.length === 0) return;
    showConfirmationAlert({
      title: "Clear Ignored Users",
      content: `Remove all ${users.length} users from ignore list?`,
      confirmText: "Clear",
      cancelText: "Cancel",
      onConfirm: () => {
        storage.ignore.users = [];
        setUsers([]);
        showToast("Cleared all ignored users", getAssetIDByName("Check"));
      },
    });
  };

  return (
    <ScrollView style={{ flex: 1 }}>
      <FormSection title="Filters">
        <FormSwitchRow
          label="Ignore Bots"
          subLabel="Don't log messages sent by bot accounts"
          leading={<FormRow.Icon source={getAssetIDByName("ic_robot")} />}
          value={!!storage.ignore.bots}
          onValueChange={(v: boolean) => {
            storage.ignore.bots = v;
          }}
        />
        <FormSwitchRow
          label="Ignore My Own Messages"
          subLabel="Don't log deletions or edits of your own messages"
          leading={<FormRow.Icon source={getAssetIDByName("ic_account_circle_24px")} />}
          value={!!storage.ignore.ownMessages}
          onValueChange={(v: boolean) => {
            storage.ignore.ownMessages = v;
          }}
        />
      </FormSection>

      <FormSection title="Ignored Users">
        <FormRow
          label="Clear All Ignored Users"
          subLabel={`${users.length} user${users.length === 1 ? "" : "s"} ignored`}
          leading={<FormRow.Icon source={getAssetIDByName("ic_trash_24px")} />}
          onPress={handleClearUsers}
        />

        {users.length === 0 ? (
          <FormText style={{ padding: 12, opacity: 0.5 }}>
            No users currently ignored.
          </FormText>
        ) : (
          users.map((id: string) => {
            const user = UserStore?.getUser(id);
            const name = user?.username ? `@${user.username}` : `User ID: ${id}`;
            return (
              <FormRow
                key={id}
                label={name}
                leading={<FormRow.Icon source={getAssetIDByName("ic_member")} />}
                trailing={
                  <FormRow.Icon
                    source={getAssetIDByName("ic_close_24px")}
                    onPress={() => handleRemoveUser(id)}
                  />
                }
              />
            );
          })
        )}
      </FormSection>
    </ScrollView>
  );
}
