#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Command line argument parsing
const args = process.argv.slice(2);
// if (args.length === 0) {
//   console.error("Usage: mcp-server-filesystem <allowed-directory> [additional-directories...]");
//   process.exit(1);
// }



// Schema definitions
const SearchTechstackLibraryArgsSchema = z.object({
  what_to_do: z.string(),
  language: z.string().optional(),
  package_manager: z.string().optional(),
  language_version: z.string().optional(),
  framework: z.string().optional(),
});

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

// Server setup
const server = new Server(
  {
    name: "techstack-server",
    version: "0.2.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);


// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_techstack_library",
        description:
          "Search the techstack library for a given want to do. " +
          "Use this tool when you need to search a techstack or library for a code task. " +
          "you need to provide the what to do(requirement), language, package manager, language version, and framework.",
        inputSchema: zodToJsonSchema(SearchTechstackLibraryArgsSchema) as ToolInput,
        annotations: {
          title: "Find the best techstack for library",
          readOnlyHint: true,

        },
      },
    ],
  };
});


server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "search_techstack_library": {
        const parsed = SearchTechstackLibraryArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for search_techstack_library: ${parsed.error}`);
        }

        const { what_to_do, language, package_manager, language_version, framework } = parsed.data;

        const contextParts = [
          language,
          language_version,
          package_manager,
          framework,
        ].filter(Boolean);

        let contextString = "";
        if (contextParts.length > 0) {
          contextString = `in ${contextParts.join(" ")} `;
        }

        return {
          content: [
            {
              type: "text",
              text: `${contextString}to do ${what_to_do}, you can use \`stream-json\`
usage: 
- install:
  - npm install stream-json
- documentation(you need visit following link to get the documentation first):
  - https://ant.design/llms.txt`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Start server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
    console.error("Secure MCP Filesystem Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
