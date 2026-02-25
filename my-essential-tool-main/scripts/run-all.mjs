import { exec } from "node:child_process";
import process from "node:process";

const skipSeed = process.argv.includes("--skip-seed");

// Build npm command - exec handles shell PATH resolution better than spawn
function buildNpmCommand(args) {
  return `npm ${args.join(" ")}`;
}

function runOnce(name, args) {
  return new Promise((resolve, reject) => {
    const command = buildNpmCommand(args);
    const child = exec(command, {
      shell: true,
      env: process.env,
      windowsHide: false
    });

    // Pipe output to console
    if (child.stdout) child.stdout.pipe(process.stdout);
    if (child.stderr) child.stderr.pipe(process.stderr);

    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${name} exited with ${signal ? `signal ${signal}` : `code ${code}`}`));
      }
    });

    child.on("error", (error) => {
      reject(new Error(`${name} failed to start: ${error.message}`));
    });
  });
}

function runLong(name, args) {
  const command = buildNpmCommand(args);
  
  const child = exec(command, {
    shell: true,
    env: process.env,
    windowsHide: false
  });

  // Pipe output and input
  if (child.stdout) child.stdout.pipe(process.stdout);
  if (child.stderr) child.stderr.pipe(process.stderr);
  process.stdin.pipe(child.stdin);

  child.on("error", (error) => {
    console.error(`[${name}] failed to start: ${error.message}`);
  });

  return child;
}

async function main() {
  if (skipSeed) {
    console.log("Skipping Mongo seed (--skip-seed).");
  } else {
    console.log("Seeding MongoDB...");
    try {
      await runOnce("seed:mongo", ["run", "seed:mongo"]);
    } catch (error) {
      console.error(`Startup aborted: ${error.message}`);
      process.exit(1);
    }
  }

  console.log("Starting backend and frontend...");
  const children = [
    runLong("backend", ["run", "server"]),
    runLong("frontend", ["run", "dev"]),
  ];

  let shuttingDown = false;
  const shutdown = (reason) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\nStopping services (${reason})...`);
    for (const child of children) {
      if (child && !child.killed) {
        child.kill("SIGTERM");
      }
    }
    setTimeout(() => process.exit(0), 300);
  };

  for (const child of children) {
    child.on("exit", (code, signal) => {
      if (shuttingDown) return;
      const status = code !== null ? `code ${code}` : `signal ${signal}`;
      shutdown(`child exited (${status})`);
    });
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error(`Unexpected startup error: ${error.message}`);
  process.exit(1);
});
