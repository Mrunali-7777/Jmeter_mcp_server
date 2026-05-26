const { Server } = require("@modelcontextprotocol/sdk/server/index.js");

const {
  StdioServerTransport,
} = require("@modelcontextprotocol/sdk/server/stdio.js");

const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");

const { exec } = require("child_process");
const fs = require("fs");


// CREATE MCP SERVER
const server = new Server(
  {
    name: "jmeter-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);


// LIST AVAILABLE TOOLS
server.setRequestHandler(
  ListToolsRequestSchema,
  async () => ({
    tools: [
      {
        name: "run_jmeter_test",
        description: "Run a JMeter test file",
        inputSchema: {
          type: "object",
          properties: {
            testFile: {
              type: "string",
              description: "Full path of JMX test file",
            },
          },
          required: ["testFile"],
        },
      },
    ],
  })
);


// HANDLE TOOL EXECUTION
server.setRequestHandler(
  CallToolRequestSchema,
  async (request) => {

    const { name, arguments: args } = request.params;

    if (name === "run_jmeter_test") {

      return new Promise((resolve) => {

        // JMETER PATH
        const jmeterPath =
          "C:/Jmeter/apache-jmeter-5.6.3/apache-jmeter-5.6.3/bin/jmeter.bat";

        // RESULT FILE
        const resultFile = "result.jtl";

        // COMMAND
        const command =
          `"${jmeterPath}" -n -t "${args.testFile}" -l "${resultFile}"`;

        console.log("Executing Command:");
        console.log(command);

        exec(command, (error, stdout, stderr) => {

          if (error) {

            resolve({
              content: [
                {
                  type: "text",
                  text:
                    `JMeter Execution Failed\n\n` +
                    `Error: ${error.message}\n\n` +
                    `STDERR:\n${stderr}`,
                },
              ],
            });

            return;
          }

          let summary =
            "JMeter Test Completed Successfully\n\n";

          if (fs.existsSync(resultFile)) {

            const data =
              fs.readFileSync(resultFile, "utf8");

            const lines =
              data.trim().split("\n").length - 1;

            summary +=
              `Total Requests Executed: ${lines}\n\n`;
          }

          summary += `STDOUT:\n${stdout}\n`;

          if (stderr) {
            summary += `\nSTDERR:\n${stderr}`;
          }

          resolve({
            content: [
              {
                type: "text",
                text: summary,
              },
            ],
          });

        });

      });

    }

    return {
      content: [
        {
          type: "text",
          text: "Unknown tool requested",
        },
      ],
    };

  }
);


// START MCP SERVER
async function main() {

  const transport =
    new StdioServerTransport();

  await server.connect(transport);

  console.error("JMeter MCP Server Running...");
}

main();