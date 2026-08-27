import { prisma } from "../src/server/db/prisma";
import {
  formatPilotProvisioningCommandError,
  runPilotProvisioningCommand
} from "../src/server/operations/pilot-provisioning-command";

try {
  await runPilotProvisioningCommand(process.argv.slice(2));
} catch (error) {
  console.error(formatPilotProvisioningCommandError(error));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
