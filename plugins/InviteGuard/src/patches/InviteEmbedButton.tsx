// patches/InviteEmbedPatch.tsx
import { findByTypeName, findByProps } from '@revenge-mod/metro'
import { React } from '@revenge-mod/metro/common'
import { instead, after } from '@vendetta/patcher'
import { storage } from '@vendetta/plugin'
import { getAssetIDByName } from '@vendetta/ui/assets'
import { showToast } from '@vendetta/ui/toasts'
import { findInReactTree } from '@vendetta/utils'

export let updateInviteEmbed = () => {}

export default function patchInviteEmbed() {
    // Find the InviteEmbed component
    const InviteEmbed = findByTypeName('InviteEmbed')
    
    if (!InviteEmbed) {
        console.warn('[InviteEmbedPatch] Could not find InviteEmbed component')
        return () => {}
    }

    const IconButton = findByProps('Button')?.Button || findByTypeName('Button')
    const ActionRow = findByTypeName('ActionRow') || findByProps('ActionRow')

    // Create the custom button
    const CustomButtonIcon = getAssetIDByName('PlusIcon') || getAssetIDByName('ic_plus_24px')

    return instead('type', InviteEmbed, (args, OriginalRender) => {
        const [, forceUpdate] = React.useReducer((x: number) => ~x, 0)
        updateInviteEmbed = () => forceUpdate()

        const res = OriginalRender(...args)
        
        if (!res?.props?.children) return res

        // Find where buttons live - look for "Join Server" button or action container
        const buttonContainer = findInReactTree(
            res,
            (x) => {
                if (!x?.props?.children) return false
                // Look for Join Server button or action row
                const children = Array.isArray(x.props.children) ? x.props.children : [x.props.children]
                return children.some((child: any) => 
                    child?.props?.label === "Join Server" ||
                    child?.props?.text === "Join Server" ||
                    child?.props?.children?.includes?.("Join")
                )
            }
        )

        if (buttonContainer && storage.showCustomButton) {
            // If we found the button container, add our button next to it
            const children = Array.isArray(buttonContainer.props.children) 
                ? buttonContainer.props.children 
                : [buttonContainer.props.children]

            // Check if button already exists
            const alreadyExists = children.some((c: any) => c?.props?.label === "My Custom Button")
            
            if (!alreadyExists) {
                // Create our custom button
                const customButton = React.createElement(
                    IconButton || ActionRow || 'Button',
                    {
                        label: storage.buttonLabel || "My Button",
                        text: storage.buttonLabel || "My Button",
                        icon: CustomButtonIcon,
                        onPress: () => {
                            // Custom action - change this to whatever you want!
                            showToast("Custom button pressed!", getAssetIDByName("toast_copy_link"))
                            // Example: open a URL, copy something, etc.
                            // clipboard.setString("Custom action!")
                        },
                        style: { marginLeft: 8 }
                    }
                )

                // Add the button
                if (Array.isArray(buttonContainer.props.children)) {
                    buttonContainer.props.children.push(customButton)
                } else {
                    buttonContainer.props.children = [buttonContainer.props.children, customButton]
                }
            }
        }

        return res
    })
}