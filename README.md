# Hubs Portals Add-On
A [Mozilla Hubs](https://github.com/mozilla/hubs/) add-on that implements a simple portal system using the Hubs Add-On API. If the room has spawn permissions, any user will be able to spawn portals. The last 2 spawned portals will be linked together. You can travel between two linked portals. Every time a portal is crossed it will print a message with the number of times that it has been crossed.

![ScreenRecording2024-02-12at16 01 12-ezgif com-video-to-gif-converter(1)](https://github.com/MozillaReality/hubs-portals-addon/assets/837184/e226ab58-b28c-4ef2-994d-34f773be709f)


## Install
1. Add the add-on to your Hubs client add-ons configuration file.

`addons.json`
```
{
  "addons": [
    ...
    "hubs-portals-addon", 
    ...
  ]
}
```
2. Create room in your Hubs instance.
3. Enable the add-on in the room configuration.

## Usage
- To spawn a new portal you can:

    * Use the ```portal``` chat command. optionally you can pass a Hex color argument to set the portal color upon spawn.
    * Use the ```n``` key.

- To change the portal color to a random color:

    * Use the ```control + n``` key combination while pointing to a portal.

- Press ```x``` while pointing to a portal to delete that portal and it's linked portal.
