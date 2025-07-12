// NEW TOOLS EXAMPLE
// THIS IS HOW WOULD YOU CREATE NEW TOOLS

// import type { Sandbox } from '@vercel/sandbox';
// import { tool } from 'ai';
// import z from 'zod';

// export const createRunCommandTool = (getSandbox: () => Promise<Sandbox>) => {
//   return tool({
//     description:
//       'Run an arbitrary shell command in the sandbox. Use this for advanced operations such as creating, copying, moving files, or running scripts. Returns the command output.',
//     inputSchema: z.object({
//       command: z
//         .string()
//         .describe(
//           "The shell command to execute. Example: 'ls -la' or 'cp src/a.js src/b.js'"
//         ),
//     }),
//     execute: async ({ command }) => {
//       try {
//         const sandbox = await getSandbox();
//         console.log(`[run_command] Executing: ${command}`);
//         const result = await sandbox.runCommand('bash', ['-c', command]);
//         const output = await result.output();
//         return { success: true, output: output.toString() };
//       } catch (e) {
//         console.error(`Error running command '${command}':`, e);
//         return { error: e };
//       }
//     },
//   });
// };
