import * as fs from "fs";

async function run() {
  const envFile = fs.readFileSync(".env.local", "utf8");
  const match = envFile.match(/GOOGLE_GENERATIVE_AI_API_KEY=(.*)/);
  if (!match) {
    console.error("API key not found");
    return;
  }
  const key = match[1].trim();
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + key);
  const data = await res.json();
  console.log(JSON.stringify(data.models.map((m: any) => m.name), null, 2));
}

run();
