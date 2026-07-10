const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const jobsFile = process.env.SYNC_JOBS_FILE || "/sync/sync-jobs.json";
const crontabFile = process.env.SYNC_CRONTAB_FILE || "/etc/crontabs/root";
const runOnStart = process.env.SYNC_RUN_ON_START === "true";

const ENV_NAMES = [
  "TZ",
  "NODE_PATH",
  "SYNC_TARGET_URL",
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_DATABASE",
  "CENTER_NAME",
  "SSJ_BASE_URL",
  "SSJ_ENDPOINT_GET_SQL",
  "SSJ_ENDPOINT_POST",
  "SSJ_SYNC_SECRET",
  "UPDATE_LOG_FILE",
];

function quoteCronValue(value) {
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("$", "\\$")}"`;
}

function readJobs() {
  const raw = fs.readFileSync(jobsFile, "utf8");
  const jobs = JSON.parse(raw);

  if (!Array.isArray(jobs)) {
    throw new Error(`${jobsFile} must contain a JSON array`);
  }

  return jobs.filter((job) => job && job.enabled !== false);
}

function validateJob(job) {
  if (!job.name || !job.script || !job.cron) {
    throw new Error(`Invalid sync job: ${JSON.stringify(job)}`);
  }

  const scriptPath = path.resolve("/sync", job.script);
  if (!scriptPath.startsWith(path.resolve("/sync") + path.sep)) {
    throw new Error(`Sync job script must be inside /sync: ${job.script}`);
  }

  return scriptPath;
}

function writeCrontab(jobs) {
  const lines = [
    "SHELL=/bin/sh",
    "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
  ];

  for (const name of ENV_NAMES) {
    if (process.env[name] !== undefined) {
      lines.push(`${name}=${quoteCronValue(process.env[name])}`);
    }
  }

  for (const job of jobs) {
    const scriptPath = validateJob(job);
    lines.push(`${job.cron} cd /sync && node ${scriptPath} >> /proc/1/fd/1 2>> /proc/1/fd/2`);
  }

  fs.writeFileSync(crontabFile, `${lines.join("\n")}\n`);
}

function runStartupJobs(jobs) {
  if (!runOnStart) return;

  for (const job of jobs) {
    const scriptPath = validateJob(job);
    console.log(`sync startup job: ${job.name}`);
    const result = spawnSync("node", [scriptPath], {
      cwd: "/sync",
      env: process.env,
      stdio: "inherit",
    });

    if (result.status !== 0) {
      console.error(`sync startup job failed: ${job.name} status=${result.status}`);
    }
  }
}

const { resolveBaseUrl, resolveGetUrl, resolvePostUrl, getSecret } = require("./jobs/sync_config");

console.log(`sync base url: ${resolveBaseUrl()}`);
console.log(`sync post target: ${resolvePostUrl()}`);
console.log(`sync get targets: sql-command=${resolveGetUrl("sql-command")}`);
console.log(`sync secret: ${getSecret() ? "configured" : "not set"}`);
console.log(`sync jobs file: ${jobsFile}`);

const jobs = readJobs();
writeCrontab(jobs);

console.log(`sync jobs enabled: ${jobs.map((job) => `${job.name}=${job.cron}`).join(", ")}`);

runStartupJobs(jobs);
