import { components, React, ReactNative } from '@vendetta/metro/common'
import { storage } from '@vendetta/plugin'
import { useProxy } from '@vendetta/storage'
import { getAssetIDByName } from '@vendetta/ui/assets'
import { updateInviteEmbed } from './patches/InviteEmbedButton'

const { TableRowGroup, TableSwitchRow, TableRowIcon, Stack } = components
const { ScrollView } = ReactNative

export default function Settings() {
    useProxy(storage)

    React.useEffect(() => {
        return () => {
            updateInviteEmbed()
        }
    }, [])

    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 38 }}>
            <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={24}>
                {TableRowGroup && (
                    <TableRowGroup title="Invite Embed Settings">
                        <TableSwitchRow
                            label="Show Custom Button"
                            subLabel="Show your custom button in invite embeds"
                            icon={TableRowIcon ? <TableRowIcon source={getAssetIDByName("PlusIcon")!} /> : null}
                            value={storage.showCustomButton}
                            onValueChange={v => (storage.showCustomButton = v)}
                        />
                    </TableRowGroup>
                )}
            </Stack>
        </ScrollView>
    )
}