import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const groups = {
  web: [{ port: 3020, service: "Next.js" }],
  supabase: [
    { port: 57320, service: "Shadow database" },
    { port: 57321, service: "Supabase API" },
    { port: 57322, service: "PostgreSQL" },
    { port: 57323, service: "Supabase Studio" },
    { port: 57324, service: "Inbucket" },
    { port: 57325, service: "Reservada" },
    { port: 57326, service: "Reservada" },
    { port: 57327, service: "Analytics" },
    { port: 57328, service: "Reservada" },
    { port: 57329, service: "Pooler" }
  ]
};

async function check({ port, service }) {
  try {
    const { stdout } = await execFileAsync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"]);
    return { port, service, free: stdout.trim().length === 0 };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 1) return { port, service, free: true };
    throw error;
  }
}

const option = process.argv[2] ?? "--all";
const targets = option === "--web" ? groups.web : option === "--supabase" ? groups.supabase : [...groups.web, ...groups.supabase];
const results = await Promise.all(targets.map(check));
const conflicts = results.filter((result) => !result.free);

for (const result of results) {
  console.log(`${result.free ? "✓" : "✗"} ${result.port} — ${result.service}: ${result.free ? "livre" : "ocupada"}`);
}

if (conflicts.length) {
  console.error("\nInicialização cancelada. Nenhum processo externo foi interrompido.");
  console.error("Libere conscientemente as portas ou configure e valide um novo bloco completo.");
  process.exit(1);
}
