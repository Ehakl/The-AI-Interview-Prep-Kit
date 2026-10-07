const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const PipelineRunner = require('../services/PipelineRunner');

/**
 * evaluate.js
 * Mandatory Batch Entry Point
 * Command: npm run evaluate -- --input <cases.json> --output <kits.json>
 */

program
  .option('--input <path>', 'Input cases JSON file')
  .option('--output <path>', 'Output kits JSON file');

program.parse(process.argv);
const options = program.opts();

async function runBatch() {
  if (!options.input || !options.output) {
    console.error("Usage: npm run evaluate -- --input <cases.json> --output <kits.json>");
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), options.input);
  const outputPath = path.resolve(process.cwd(), options.output);

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found at ${inputPath}`);
    process.exit(1);
  }

  const cases = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const runner = new PipelineRunner();
  
  const results = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    kits: []
  };

  for (const c of cases) {
    console.log(`Processing case: ${c.id}...`);
    try {
      // Validate Edge Case: "The user asks for a 1-day schedule, or a 60-day one"
      let days = c.days;
      if (days < 1) days = 1;
      if (days > 60) days = 60; // Cap reasonable prep time to 60 days

      const kit = await runner.run(c.jd, c.company_url, days);
      
      results.kits.push({
        id: c.id,
        status: "ok",
        kit: kit,
        error: null
      });
    } catch (e) {
      console.error(`[Evaluate] Case ${c.id} failed:`, e.message);
      results.kits.push({
        id: c.id,
        status: "failed",
        kit: null,
        error: {
          code: "GENERATION_FAILED",
          message: e.message
        }
      });
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Batch evaluation complete. Results written to ${outputPath}`);
}

runBatch();
