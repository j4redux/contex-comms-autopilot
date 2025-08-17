// server/src/services/inngest.ts
// Backend Inngest client and functions for Claude Code processing

import { Inngest } from "inngest"
import { realtimeMiddleware, channel, topic } from "@inngest/realtime"
import { executeCommand } from "./daytona"
import { createSandbox } from "./sandbox"

// Create backend Inngest client with realtime middleware
export const inngest = new Inngest({
  id: "omni-backend", 
  middleware: [realtimeMiddleware()],
})

// Task channel definition (must match frontend exactly)
export const taskChannel = channel("tasks")
  .addTopic(
    topic("status").type<{
      taskId: string;
      status: "IN_PROGRESS" | "DONE" | "MERGED";
      sessionId: string;
    }>()
  )
  .addTopic(
    topic("update").type<{
      taskId: string;
      message: Record<string, unknown>;
    }>()
  )

// Task creation function - handles frontend task creation requests
export const createTask = inngest.createFunction(
  { id: "create-task" },
  { event: "omni/create.task" },
  async ({ event, step }) => {
    const { task, userId, prompt } = event.data;
    
    console.log("🎯 Creating task:", { taskId: task.id, userId, prompt: prompt?.substring(0, 50) + "..." });
    
    try {
      // Step 1: Create/ensure sandbox exists and is ready
      const sandbox = await step.run("ensure-sandbox", async () => {
        console.log("📦 Ensuring sandbox for user:", userId);
        const sb = await createSandbox(userId);
        console.log("✅ Sandbox ready:", { sandboxId: sb.id, status: sb.status });
        return sb;
      });
      
      // Step 2: Trigger knowledge processing with proper data structure
      await step.run("trigger-processing", async () => {
        const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        
        console.log("🧠 Triggering knowledge processing:", { taskId: task.id, sandboxId: sandbox.id, jobId });
        
        await inngest.send({
          name: "omni/process.knowledge",
          data: {
            taskId: task.id,
            sandboxId: sandbox.id,
            userId,
            input: prompt,
            model: "sonnet", // Default model
            jobId,
          },
        });
        
        console.log("✅ Knowledge processing triggered successfully");
        return { jobId, accepted: true };
      });
      
    } catch (error) {
      console.error("❌ Task creation failed:", error);
      throw error;
    }
  }
)

// Full Claude Code processing function (restored from original WebSocket implementation)
export const processKnowledge = inngest.createFunction(
  { id: "process-knowledge" },
  { event: "omni/process.knowledge" },
  async ({ event, step, publish }) => {
    const { taskId, sandboxId, userId, input, model, jobId } = event.data;
    
    console.log("🚀 Inngest function started:", { taskId, sandboxId, input })

    try {
      console.log("🔍 About to send initial status")
      // Send initial status (equivalent to original broadcastLog)
      await publish(
        taskChannel().update({
          taskId,
          message: {
            type: "log",
            data: "job started",
            jobId,
            ts: Date.now(),
          }
        })
      )
      console.log("✅ Initial status sent successfully")

      // Pre-flight checks (matching original logic)  
      console.log("🔍 About to start step.run")
      const result = await step.run("claude-processing", async () => {
        console.log("🔍 Inside step.run - checking workspace directory")
        // Check workspace directory
        try {
          await publish(
            taskChannel().update({
              taskId,
              message: {
                type: "log", 
                data: "artifact base: /workspace",
                jobId,
                ts: Date.now(),
              }
            })
          )
          console.log("✅ Published workspace check message")
        } catch (publishError) {
          console.error("❌ Publish error in step.run:", publishError)
          throw publishError
        }

        console.log("🔍 About to execute workspace check command")
        const workspaceCheck = await executeCommand(sandboxId, "ls /workspace > /dev/null 2>&1")
        console.log("✅ Workspace check completed:", { exitCode: workspaceCheck.exitCode })
        const artifactBase = workspaceCheck.exitCode === 0 ? "/workspace" : "/home/daytona"
        if (artifactBase === "/home/daytona") {
          await publish(
            taskChannel().update({
              taskId,
              message: {
                type: "log",
                data: "artifact base fallback: /home/daytona", 
                jobId,
                ts: Date.now(),
              }
            })
          )
        }

        // Verify Claude Code is available (original logic)
        const claudeCheck = await executeCommand(sandboxId, "claude --version")
        if (claudeCheck.exitCode === 0) {
          await publish(
            taskChannel().update({
              taskId,
              message: {
                type: "log",
                data: "claude --version OK",
                jobId,
                ts: Date.now(),
              }
            })
          )
        } else {
          await publish(
            taskChannel().update({
              taskId,
              message: {
                type: "error",
                code: "CLAUDE_NOT_AVAILABLE",
                message: "Claude Code CLI not available in sandbox",
                jobId,
                ts: Date.now(),
              }
            })
          )
          return { success: false, error: "Claude not available" }
        }

        // Verify API key (original logic)
        const apiKeyCheck = await executeCommand(sandboxId, "test -n \"$ANTHROPIC_API_KEY\" && echo present || echo missing")
        await publish(
          taskChannel().update({
            taskId,
            message: {
              type: "log",
              data: `ANTHROPIC_API_KEY: ${apiKeyCheck.stdout.trim()}`,
              jobId,
              ts: Date.now(),
            }
          })
        )

        // Network preflight checks (original logic)
        await publish(
          taskChannel().update({
            taskId,
            message: {
              type: "log",
              data: "dns preflight: api.anthropic.com",
              jobId,
              ts: Date.now(),
            }
          })
        )
        await executeCommand(sandboxId, "nslookup api.anthropic.com > /dev/null 2>&1")

        await publish(
          taskChannel().update({
            taskId,
            message: {
              type: "log",
              data: "https preflight: api.anthropic.com",
              jobId,
              ts: Date.now(),
            }
          })
        )
        await executeCommand(sandboxId, "curl -s --head https://api.anthropic.com > /dev/null 2>&1")

        // Execute Claude using the exact original pattern
        const selectedModel = model || "sonnet"
        const escapedInput = input.replace(/"/g, '\\"')
        const command = `echo "${escapedInput}" | claude -p --output-format json --model ${selectedModel}`

        await publish(
          taskChannel().update({
            taskId,
            message: {
              type: "log",
              data: "executing claude command",
              jobId,
              ts: Date.now(),
            }
          })
        )

        const claudeResult = await executeCommand(sandboxId, command)

        if (claudeResult.exitCode === 0) {
          try {
            // Parse Claude's JSON response (original logic)
            const claudeResponse = JSON.parse(claudeResult.stdout)
            await publish(
              taskChannel().update({
                taskId,
                message: {
                  type: "log",
                  data: `claude response: ${claudeResponse.result?.substring(0, 100)}...`,
                  jobId,
                  ts: Date.now(),
                }
              })
            )

            // Send the actual Claude response (equivalent to original broadcastResult)
            await publish(
              taskChannel().update({
                taskId,
                message: {
                  type: "result",
                  format: "text",
                  data: claudeResponse.result || claudeResult.stdout,
                  jobId,
                  ts: Date.now(),
                }
              })
            )

            return { success: true, result: claudeResponse.result || claudeResult.stdout }
          } catch (parseError) {
            // Fallback for non-JSON responses (original logic)
            await publish(
              taskChannel().update({
                taskId,
                message: {
                  type: "log",
                  data: "json parse failed, using raw output",
                  jobId,
                  ts: Date.now(),
                }
              })
            )

            await publish(
              taskChannel().update({
                taskId,
                message: {
                  type: "result",
                  format: "text", 
                  data: claudeResult.stdout,
                  jobId,
                  ts: Date.now(),
                }
              })
            )

            return { success: true, result: claudeResult.stdout }
          }
        } else {
          // Handle Claude command failure (original logic)
          await publish(
            taskChannel().update({
              taskId,
              message: {
                type: "error",
                code: "CLAUDE_COMMAND_FAILED",
                message: `Claude command failed with exit code ${claudeResult.exitCode}: ${claudeResult.stderr}`,
                jobId,
                ts: Date.now(),
              }
            })
          )
          return { success: false, error: claudeResult.stderr }
        }
      })

      // Send completion status (equivalent to original broadcastDone)
      await publish(
        taskChannel().update({
          taskId,
          message: {
            type: "done",
            exitCode: result.success ? 0 : 1,
            jobId,
            ts: Date.now(),
          }
        })
      )

      // Update task status
      await publish(
        taskChannel().status({
          taskId,
          status: "DONE",
          sessionId: sandboxId,
        })
      )

      return result
    } catch (error) {
      // Handle unexpected errors (original logic)
      await publish(
        taskChannel().update({
          taskId,
          message: {
            type: "error",
            code: "EXECUTION_ERROR",
            message: String(error),
            jobId,
            ts: Date.now(),
          }
        })
      )

      await publish(
        taskChannel().status({
          taskId,
          status: "DONE",
          sessionId: sandboxId,
        })
      )

      return { success: false, error: String(error) }
    }
  }
)