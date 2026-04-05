var speed = 0;
var spawned = 10;
var lastSpawn = Date.now();
var line = "";

var avgRps = 0;
var avgLatency = 0;
var avgTime = 0;

async function run() {
  try {
    const res = await fetch(process.argv[2].replace("%r", `${Date.now()}`), {
      redirect: "manual",
    });
    if (!res.ok && res.status !== 307 && res.status !== 301) {
      console.log(`\r\x1b[2K${Date.now()} ${res.status}`);
      console.write(line);
    }
  } catch {
    console.log(`\r\x1b[2K${Date.now()} Error`);
    console.write(line);
  }
  speed++;
  queueMicrotask(run);
}

for (let i = 0; i < 10; i++) run();

setInterval(() => {
  const latency = (1000 / speed) * spawned;
  line = `\r\x1b[2K${speed} RPS, average ${Math.round(latency * 10) / 10}ms`;
  console.write(line);
  if (speed * 2 > spawned) {
    for (let i = spawned; i < spawned * 2; i++) run();
    spawned *= 2;
    lastSpawn = Date.now();
    console.log(`\r\x1b[2KIncreasing concurrency to ${spawned}`);
    console.write(line);
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
  speed = 0;
}, 1000);
