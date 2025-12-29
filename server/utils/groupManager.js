import Group from "../models/Group.js";
import { Host } from "../models/Host.js";

// Initialize default groups
export async function initializeDefaultGroups() {
  try {
    console.log("🔄 Initializing default groups...");

    // Check if default groups already exist
    const existingDefaults = await Group.find({ isDefault: true });
    if (existingDefaults.length > 0) {
      console.log("✅ Default groups already exist");
      return;
    }

    // Get all hosts grouped by OS
    const hosts = await Host.find({});
    const hostsByOS = {
      Windows: hosts.filter((h) => h.osName === "Windows"),
      Linux: hosts.filter((h) => h.osName === "Linux"),
    };

    const defaultGroups = [];

    // Create Windows default group if there are Windows hosts
    if (hostsByOS.Windows.length > 0) {
      const windowsGroup = new Group({
        id: 1,
        name: "Windows Hosts",
        os: "Windows",
        hosts: hostsByOS.Windows.map((h) => h._id),
        isDefault: true,
      });
      await windowsGroup.save();
      defaultGroups.push(windowsGroup);

      // Update Windows hosts to include this group
      await Host.updateMany(
        { _id: { $in: hostsByOS.Windows.map((h) => h._id) } },
        { $addToSet: { groups: windowsGroup._id } }
      );
    }

    // Create Linux default group if there are Linux hosts
    if (hostsByOS.Linux.length > 0) {
      const linuxGroup = new Group({
        id: 2,
        name: "Linux Hosts",
        os: "Linux",
        hosts: hostsByOS.Linux.map((h) => h._id),
        isDefault: true,
      });
      await linuxGroup.save();
      defaultGroups.push(linuxGroup);

      // Update Linux hosts to include this group
      await Host.updateMany(
        { _id: { $in: hostsByOS.Linux.map((h) => h._id) } },
        { $addToSet: { groups: linuxGroup._id } }
      );
    }

    console.log(`✅ Created ${defaultGroups.length} default groups`);
  } catch (error) {
    console.error("❌ Error initializing default groups:", error);
  }
}

// Refresh default groups (call when hosts are added/removed)
export async function refreshDefaultGroups() {
  try {
    console.log("🔄 Refreshing default groups...");

    // Get all hosts grouped by OS
    const hosts = await Host.find({});
    const hostsByOS = {
      Windows: hosts.filter((h) => h.osName === "Windows"),
      Linux: hosts.filter((h) => h.osName === "Linux"),
    };

    // NEW: Ensure default groups exist before updating
    // Check and create Windows default group if missing
    let windowsGroup = await Group.findOne({ id: 1, isDefault: true });
    if (!windowsGroup) {
      if (hostsByOS.Windows.length > 0) {
        windowsGroup = new Group({
          id: 1,
          name: "Windows Hosts",
          os: "Windows",
          hosts: hostsByOS.Windows.map((h) => h._id),
          isDefault: true,
        });
        await windowsGroup.save();
        console.log("✅ Created missing Windows default group");

        // Update Windows hosts to include this group
        await Host.updateMany(
          { _id: { $in: hostsByOS.Windows.map((h) => h._id) } },
          { $addToSet: { groups: windowsGroup._id } }
        );
      }
    }

    // Check and create Linux default group if missing
    let linuxGroup = await Group.findOne({ id: 2, isDefault: true });
    if (!linuxGroup) {
      if (hostsByOS.Linux.length > 0) {
        linuxGroup = new Group({
          id: 2,
          name: "Linux Hosts",
          os: "Linux",
          hosts: hostsByOS.Linux.map((h) => h._id),
          isDefault: true,
        });
        await linuxGroup.save();
        console.log("✅ Created missing Linux default group");

        // Update Linux hosts to include this group
        await Host.updateMany(
          { _id: { $in: hostsByOS.Linux.map((h) => h._id) } },
          { $addToSet: { groups: linuxGroup._id } }
        );
      }
    }

    // Now proceed with updating existing groups (existing logic)
    // Update Windows default group
    if (windowsGroup) {
      const currentHostIds = hostsByOS.Windows.map((h) => h._id.toString());
      const groupHostIds = windowsGroup.hosts.map((id) => id.toString());

      // Add new Windows hosts to the group
      const hostsToAdd = currentHostIds.filter(
        (id) => !groupHostIds.includes(id)
      );
      if (hostsToAdd.length > 0) {
        await Group.findByIdAndUpdate(windowsGroup._id, {
          $addToSet: { hosts: { $each: hostsToAdd } },
        });
        await Host.updateMany(
          { _id: { $in: hostsToAdd } },
          { $addToSet: { groups: windowsGroup._id } }
        );
      }

      // Remove hosts that are no longer Windows
      const hostsToRemove = groupHostIds.filter(
        (id) => !currentHostIds.includes(id)
      );
      if (hostsToRemove.length > 0) {
        await Group.findByIdAndUpdate(windowsGroup._id, {
          $pull: { hosts: { $in: hostsToRemove } },
        });
        await Host.updateMany(
          { _id: { $in: hostsToRemove } },
          { $pull: { groups: windowsGroup._id } }
        );
      }
    }

    // Update Linux default group
    if (linuxGroup) {
      const currentHostIds = hostsByOS.Linux.map((h) => h._id.toString());
      const groupHostIds = linuxGroup.hosts.map((id) => id.toString());

      // Add new Linux hosts to the group
      const hostsToAdd = currentHostIds.filter(
        (id) => !groupHostIds.includes(id)
      );
      if (hostsToAdd.length > 0) {
        await Group.findByIdAndUpdate(linuxGroup._id, {
          $addToSet: { hosts: { $each: hostsToAdd } },
        });
        await Host.updateMany(
          { _id: { $in: hostsToAdd } },
          { $addToSet: { groups: linuxGroup._id } }
        );
      }

      // Remove hosts that are no longer Linux
      const hostsToRemove = groupHostIds.filter(
        (id) => !currentHostIds.includes(id)
      );
      if (hostsToRemove.length > 0) {
        await Group.findByIdAndUpdate(linuxGroup._id, {
          $pull: { hosts: { $in: hostsToRemove } },
        });
        await Host.updateMany(
          { _id: { $in: hostsToRemove } },
          { $pull: { groups: linuxGroup._id } }
        );
      }
    }

    console.log("✅ Default groups refreshed");
  } catch (error) {
    console.error("❌ Error refreshing default groups:", error);
  }
}
