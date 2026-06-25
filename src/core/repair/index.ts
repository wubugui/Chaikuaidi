import type { MachineRuntimeState, ToolRuntimeState } from '../state';

export function repairTool(tool: ToolRuntimeState): ToolRuntimeState {
  return { ...tool, durability: tool.maxDurability, broken: false };
}

export function repairMachine(machine: MachineRuntimeState): MachineRuntimeState {
  return { ...machine, durability: machine.maxDurability, jammed: false, repairing: false };
}
