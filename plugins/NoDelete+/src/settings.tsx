import { React, ReactNative } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import { showConfirmationAlert } from "@vendetta/ui/alerts";
import { findByStoreName } from "@vendetta/metro";

const { FormText, FormSection, FormRow } = Forms;
let UserStore: any;

export default function Settings() {
  UserStore ??= findByStoreName("UserStore");
  useProxy(storage);

  storage.ignore ??= { users: [], bots: false };
  const [users, setUsers] = React.useState(storage.ignore.users || []);

  const handleRemoveUser = (userId: string) => {
    const newArr = users.filter((id: string) => id !== userId);
    storage.ignore.users = newArr;
    setUsers(newArr);
    showToast("User removed from ignore list", getAssetIDByName("Check"));
  };

  const handleClearUsers = () => {
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
    <ReactNative.ScrollView style={{ flex: 1 }}>
      <FormSection title="Settings">
        <FormRow
          label="Ignore Bots"
          subLabel="Don't log messages from bots"
          trailing={
            <Forms.FormSwitch
              value={storage.ignore.bots}
              onValueChange={(v: boolean) => { storage.ignore.bots = v; }}
            />
          }
        />
      </FormSection>

      <FormSection title="Ignored Users">
        <FormRow
          label="Clear All"
          subLabel={`${users.length} users ignored`}
          trailing={<FormRow.Icon source={getAssetIDByName("ic_trash_24px")} />}
          onPress={handleClearUsers}
        />

        {users.length === 0 ? (
          <FormText style={{ padding: 10 }}>No users ignored.</FormText>
        ) : (
          users.map((id: string) => {
            const user = UserStore?.getUser(id);
            const name = user?.username || id;
            return (
              <FormRow
                key={id}
                label={name}
                trailing={
                  <ReactNative.TouchableOpacity onPress={() => handleRemoveUser(id)}>
                    <FormRow.Icon source={getAssetIDByName("ic_close_24px")} />
                  </ReactNative.TouchableOpacity>
                }
              />
            );
          })
        )}
      </FormSection>
    </ReactNative.ScrollView>
  );
}