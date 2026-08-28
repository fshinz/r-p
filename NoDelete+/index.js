(function(f,u,a,i,b,c,m,$,I,n){"use strict";let F,w,S;function D(){F??=u.findByStoreName("UserStore"),w??=u.findByProps("fetchProfile","getUser","setFlag"),S??=u.findByProps("showUserProfile");async function r(s){const o=S?.showUserProfile;o&&(F.getUser(s)?o({userId:s}):w.getUser(s).then(function({id:g}){return o({userId:g})}))}$.useProxy(i.storage);const e=i.storage.ignore.users??[],t=function(s){i.storage.ignore.users=e.filter(function(o){return o!==s})},l=function(){i.storage.ignore.users=[]};return a.React.createElement(a.ReactNative.ScrollView,{style:{flex:1}},a.React.createElement(n.Forms.FormSection,{title:"Settings",titleStyleType:"no_border"},a.React.createElement(n.Forms.FormRow,{label:"Show Timestamps",trailing:a.React.createElement(n.Forms.FormSwitch,{value:i.storage.timestamps,onValueChange:function(s){return i.storage.timestamps=s}})}),a.React.createElement(n.Forms.FormRow,{label:"12-Hour Format",trailing:a.React.createElement(n.Forms.FormSwitch,{value:i.storage.ew,onValueChange:function(s){return i.storage.ew=s}})}),a.React.createElement(n.Forms.FormDivider,null),a.React.createElement(n.Forms.FormRow,{label:"Deleted messages display an Automod indicator."})),a.React.createElement(n.Forms.FormSection,{title:"Filters"},a.React.createElement(n.Forms.FormRow,{label:"Ignore Bots",trailing:a.React.createElement(n.Forms.FormSwitch,{value:i.storage.ignore.bots,onValueChange:function(s){return i.storage.ignore.bots=s}})}),a.React.createElement(n.Forms.FormRow,{label:`Clear Ignored Users (${e.length})`,trailing:a.React.createElement(n.Forms.FormRow.Icon,{source:c.getAssetIDByName("ic_trash_24px")}),onPress:function(){e.length>0&&I.showConfirmationAlert({title:"Clear Ignored Users",content:`Are you sure you want to clear ${e.length} ignored user(s)?`,confirmText:"Yes",cancelText:"No",confirmColor:"brand",onConfirm:l})}}),a.React.createElement(a.ReactNative.ScrollView,{style:{flex:1,marginLeft:15}},e.map(function(s){const o=F.getUser(s)??{},g=o?.getAvatarURL?.(null,26)?.replace?.(/\.(gif|webp)/,".png")||"https://cdn.discordapp.com/embed/avatars/1.png?size=48",R=o.username?`${o.username}${o.discriminator&&o.discriminator!=="0"?`#${o.discriminator}`:""}`:`${s} (Uncached)`;return a.React.createElement(n.Forms.FormRow,{key:s,label:R,leading:a.React.createElement(n.Forms.FormRow.Icon,{source:{uri:g}}),trailing:a.React.createElement(n.Forms.FormRow.Icon,{source:c.getAssetIDByName("ic_close_24px")}),onPress:function(){return r(s)},onTrailingPress:function(){return t(s)}})})),a.React.createElement(n.Forms.FormDivider,null),a.React.createElement(n.Forms.FormRow,{label:"Long-press a user profile sheet to ignore/unignore them."})))}let E,A;const h=[],d=[];i.storage.ignore??={users:[],bots:!1};const _=function(r){if(!r||r.length===0)return"";let e=`\u{1F4CE} **Embeds:**
`;return r.forEach(function(t,l){e+=`
**Embed ${l+1}:**`,t.title&&(e+=`
\u2022 Title: ${t.title}`),t.description&&(e+=`
\u2022 Description: ${t.description}`),t.url&&(e+=`
\u2022 URL: ${t.url}`),t.author?.name&&(e+=`
\u2022 Author: ${t.author.name}`),t.footer?.text&&(e+=`
\u2022 Footer: ${t.footer.text}`),t.fields?.length>0&&(e+=`
\u2022 Fields:`,t.fields.forEach(function(s){e+=`
  - ${s.name}: ${s.value}`})),t.image?.url&&(e+=`
\u2022 Image: ${t.image.url}`),t.thumbnail?.url&&(e+=`
\u2022 Thumbnail: ${t.thumbnail.url}`)}),e},v=function(r){if(!r||r.length===0)return"";let e=`\u{1F4C1} **Attachments:**
`;return r.forEach(function(t){e+=`\u2022 ${t.filename} (${Math.round(t.size/1024)}KB)
`,t.url&&(e+=`  ${t.url}
`)}),e},y=function(r){let e="";return r.content&&(e+=r.content),r.embeds?.length>0&&(e+=e?`

`:"",e+=_(r.embeds)),r.attachments?.length>0&&(e+=e?`

`:"",e+=v(r.attachments)),e||"(empty message)"};var M={onLoad(){try{E=u.findByStoreName("MessageStore"),A=u.findByStoreName("ChannelStore"),h.push(b.before("dispatch",a.FluxDispatcher,function(r){try{const e=r[0];if(!e||e?.type!=="MESSAGE_DELETE"||!e?.id||!e?.channelId)return;const t=E?.getMessage(e.channelId,e.id);if(!t||i.storage.ignore?.users?.includes(t.author?.id)||i.storage.ignore?.bots&&t.author?.bot)return;if(d.includes(e.id)){d.splice(d.indexOf(e.id),1);return}d.push(e.id);const l=y(t),s=t.author?.username||"Unknown",o=a.moment().format("HH:mm:ss");r[0]={type:"MESSAGE_EDIT_FAILED_AUTOMOD",messageData:{type:1,message:{channelId:e.channelId,messageId:e.id}},errorResponseBody:{code:2e5,message:`\u{1F6AB} **${s}** deleted a message:
${l}

_Deleted at ${o}_`}}}catch(e){console.error("[MessageLogger] Delete error:",e)}})),h.push(b.before("dispatch",a.FluxDispatcher,function(r){try{const e=r[0];if(!e||e?.type!=="MESSAGE_UPDATE"||!e?.message)return;const t=e.message;if(!t.id||!t.channel_id||i.storage.ignore?.users?.includes(t.author?.id)||i.storage.ignore?.bots&&t.author?.bot)return;const l=E?.getMessage(t.channel_id,t.id);if(!l||l.content===t.content&&JSON.stringify(l.embeds)===JSON.stringify(t.embeds))return;const s=y(l),o=y(t),g=t.author?.username||"Unknown",R=a.moment().format("HH:mm:ss");r[0]={type:"MESSAGE_EDIT_FAILED_AUTOMOD",messageData:{type:1,message:{channelId:t.channel_id,messageId:t.id}},errorResponseBody:{code:2e5,message:`\u270F\uFE0F **${g}** edited a message:

**Before:**
${s}

**After:**
${o}

_Edited at ${R}_`}}}catch(e){console.error("[MessageLogger] Edit error:",e)}})),m.showToast("Message Logger loaded",c.getAssetIDByName("Check"))}catch(r){console.error("[MessageLogger] Failed to load:",r),m.showToast("Failed to load Message Logger",c.getAssetIDByName("Small"))}},onUnload(){for(const r of h)try{r()}catch{}h.length=0,d.length=0,m.showToast("Message Logger unloaded",c.getAssetIDByName("Check"))},settings:D};return f.default=M,Object.defineProperty(f,"__esModule",{value:!0}),f})({},vendetta.metro,vendetta.metro.common,vendetta.plugin,vendetta.patcher,vendetta.ui.assets,vendetta.ui.toasts,vendetta.storage,vendetta.ui.alerts,vendetta.ui.components);
