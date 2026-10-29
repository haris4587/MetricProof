import {createClient} from 'genlayer-js';import {studionet} from 'genlayer-js/chains';import fs from 'node:fs';
const d=JSON.parse(fs.readFileSync('public/deployment.json')),c=createClient({chain:studionet});
const ids=JSON.parse(await c.readContract({address:d.contract,functionName:'list_cases',args:[0]}));
for(const id of ids.ids){const claim=JSON.parse(await c.readContract({address:d.contract,functionName:'get_case',args:[id]}));console.log(JSON.stringify({id,claim}));}
