import {
  EntityID,
  MigrationFn,
  NetworkSchema,
  StoredComponent,
  defineNetworkSchema,
  deserializerWithMigrations,
  read,
  write
} from "hubs";
import { NetworkedPortal } from "./components";

const migrations = new Map<EntityID, MigrationFn>();

function apply(eid: EntityID, { version, data }: StoredComponent) {
  if (version !== 1) return false;

  const { color }: { color: number } = data;
  write(NetworkedPortal.color, eid, color);
  return true;
}

const runtimeSerde = defineNetworkSchema(NetworkedPortal);
export const NetworkedPortalSchema: NetworkSchema = {
  componentName: "networked-portal",
  serialize: runtimeSerde.serialize,
  deserialize: runtimeSerde.deserialize,
  serializeForStorage: function serializeForStorage(eid: EntityID) {
    return {
      version: 1,
      data: {
        color: read(NetworkedPortal.color, eid)
      }
    };
  },
  deserializeFromStorage: deserializerWithMigrations(migrations, apply)
};
