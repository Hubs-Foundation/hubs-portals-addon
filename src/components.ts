import { Types, defineComponent } from "bitecs";

export const Portal = defineComponent({
  flags: Types.ui8,
  name: Types.ui32,
  target: Types.ui32,
  color: Types.ui32,
  count: Types.ui8
});

export const NetworkedPortal = defineComponent({
  color: Types.ui32
});
