# Hubs Portals Add-On

A [Hubs](https://github.com/Hubs-Foundation/hubs) add-on that implements a simple portal system using the Hubs Add-On API. If the room has spawn permissions, any user will be able to spawn portals. The last 2 spawned portals will be linked together. You can travel between two linked portals. Every time a portal is crossed it will print a message with the number of times that it has been crossed.

As of now add-ons are not yet part of the main Hubs branch, so you'll need to use the Hubs client [add-ons branch](https://github.com/Hubs-Foundation/hubs/tree/addons) and install this add-on on it.

https://github.com/Hubs-Foundation/hubs-duck-addon/assets/837184/3ebdfb71-e461-4515-aa75-12ee404686ad

## Install

1. Install the node-module:

```
> npm i https://github.com/Hubs-Foundation/hubs-portals-addon.git
```

2. Add the add-on to your Hubs client add-ons configuration file.

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

  - Use the `portal` chat command. optionally you can pass a Hex color argument to set the portal color upon spawn.
  - Use the `n` key.

- To change the portal color to a random color:

  - Use the `control + n` key combination while pointing to a portal.

- Press `x` while pointing to a portal to delete that portal and it's linked portal.
