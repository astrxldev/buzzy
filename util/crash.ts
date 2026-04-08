import { randomBytes } from "node:crypto";

var speed = 0;
var errors = 0;
var spawned = 10;
var lastSpawn = Date.now();
var cooldown = Date.now();
var line = "";

var avgRps = 0;
var avgLatency = 0;
var avgTime = 0;

const url = process.argv.pop()!;

async function run(i: number) {
  if (i > spawned) return;
  try {
    const res = await fetch(
      url.replace(
        /%r(\d*)/g,
        (_, s) =>
          `${randomBytes(parseInt(s || "10", 10)).toString("base64url")}`,
      ),
      {
        redirect: "manual",
      },
    );
    if (!res.ok && res.status !== 307 && res.status !== 301) {
      console.log(`\r\x1b[2K${Date.now()} ${res.status}`);
      console.write(line);
      if (res.status === 429) errors++;
    }
  } catch {
    errors++;
    console.log(`\r\x1b[2K${Date.now()} Error`);
    console.write(line);
  }
  speed++;
  queueMicrotask(run.bind(null, i));
}

for (let i = 0; i < 10; i++) run(i);

setInterval(() => {
  const latency = (1000 / speed) * spawned;
  line = `\r\x1b[2K${speed} RPS, ${spawned} workers average ${Math.round(latency * 10) / 10}ms`;
  console.write(line);
  if (errors > 10 && spawned > 10) {
    spawned /= 2;
    console.log(`\r\x1b[2KDecreasing concurrency to ${spawned}`);
    console.write(line);
    cooldown = Date.now() + 2000;
  } else if (speed * 2 > spawned && Date.now() > cooldown) {
    spawned *= 2;
    for (let i = spawned / 2; i < spawned; i++) run(i);
    lastSpawn = Date.now();
    console.log(`\r\x1b[2KIncreasing concurrency to ${spawned}`);
    console.write(line);
  } else if (
    process.argv.includes("--infinite") ||
    process.argv.includes("-i")
  ) {
  } else if (Date.now() - lastSpawn > 30000) {
    console.log(
      `\r\x1b[2KAverage sample done\n${(avgRps / avgTime).toFixed(1)} RPS, latency ${(avgLatency / avgTime).toFixed(1)}ms`,
    );
    process.exit();
  } else if (Date.now() - lastSpawn > 5000) {
    if (avgTime === 0) {
      console.log(`\r\x1b[2KStable point, recording average.`);
      console.write(line);
    }
    avgRps += speed;
    avgLatency += latency;
    avgTime++;
  }
  errors = 0;
  speed = 0;
}, 1000);
