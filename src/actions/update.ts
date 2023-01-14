
import { chunk } from 'lodash';
import { downloadBaseJson } from '../downloader/base';
import { downloadBc } from '../downloader/bc';
import { downloadExtlist } from '../downloader/extlist';
import { Extlist } from '../models/extlist';
import { mkdir } from '../utils';
import minimist from "minimist";
const cliProgress = require('cli-progress');

async function update(outPath: string, redownload: boolean, useProgressBar: boolean) {
  const baseJson = await downloadBaseJson(outPath);
  const extlist = Extlist.load(await downloadExtlist(outPath, baseJson.extlist));

  const binPath = mkdir(outPath, 'bin');

  let pbar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

  const downloadFns = extlist.entries.map((entry) => async () => { 
    let isNew = await downloadBc(binPath, baseJson.extlist, entry, redownload);
    if (useProgressBar) {pbar.increment();}
    return isNew;
  });

  if (useProgressBar) {pbar.start(downloadFns.length, 0);}

  for (const tasks of chunk(downloadFns, 50)) {
    await Promise.all(tasks.map((task) => task()));
  }
  if (useProgressBar) {pbar.stop();}

  console.log('Up to date.');
}

export async function main(args: string[]) {
  const parsedArgs = minimist(args, {
    boolean: ['redownload', 'for-tsubaki', 'help'],
  });

  if (parsedArgs._ .length !== 1 || parsedArgs.help) {
    console.log(
      "usage: pad-resources update <data directory> [--redownload] [--for-tsubaki]"
    );
    return parsedArgs.help;
  }
  
  await update(parsedArgs._[0], parsedArgs.redownload, parsedArgs['for-tsubaki']);

  return true;
}
