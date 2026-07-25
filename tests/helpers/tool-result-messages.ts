import type { ToolResultMessages } from '@/components/ui/tool-result';

// The shared strings every heavy tool passes to <ToolResult>. Kept in one place
// so a tool test only has to spread it, and so adding a key to the panel breaks
// one file instead of sixteen.
export const resultMessages: ToolResultMessages = {
  heading: 'Your file is ready',
  download: 'Download',
  retry: 'Change settings',
  originalLabel: 'Original',
  outputLabel: 'Result',
  smaller: '{percent}% smaller',
  larger: '{percent}% larger',
  same: 'Same size',
  ready: 'Processing complete. Your file is ready to download.',
};
