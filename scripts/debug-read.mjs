import {createClient} from 'genlayer-js';import{studionet}from'genlayer-js/chains';
const c=createClient({chain:studionet});try{console.log(await c.readContract({address:'0x5a9E1836E6734dc0981192a3582b26D02a4743b1',functionName:'get_dataset',args:['059afb05b4ed787b033c0b11b6f36a6c6df1ab02412e58b06d528d312b254c61']}));}catch(e){console.log(JSON.stringify(e,Object.getOwnPropertyNames(e),2));}
