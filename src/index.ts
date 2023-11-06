#! /usr/bin/env node

import { Command } from "commander";
import { textSync } from "figlet";
import { description, name, version } from "../package.json";

new Command()
  .version(version)
  .description(description)
  .action((args) => {
    console.log(textSync(name));
    console.log(version);
    console.log(description);
    console.log("🚀 ~ file: index.ts:12 ~ args:", args);
  })
  .parse(process.argv);
