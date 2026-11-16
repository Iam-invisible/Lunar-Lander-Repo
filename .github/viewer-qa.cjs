const {chromium}=require(process.env.RUNNER_TEMP+'/craterview-qa/node_modules/playwright-core');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
 try {
 const page=await browser.newPage({viewport:{width:1400,height:660}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5398/#10,10,3600000,0,0,2026-11-17T12:00Z');
 await page.waitForFunction(()=>window.__moon?.tree?.stats.drawn>8,null,{timeout:60000});
 const data=await page.evaluate(async()=>{
  const meta=await (await fetch('/tiles/meta.json')).json();
  let res=await fetch('/tiles/f/2/0/0/0.bin');
  const inflated=await new Response(res.body.pipeThrough(new DecompressionStream('deflate'))).arrayBuffer();
  return {levels:[meta.maxLevel,meta.colourMaxLevel],overlay:meta.feasibility.maxLevel,overlayMagic:new TextDecoder().decode(inflated.slice(0,4)),stats:window.__moon.tree.stats.drawn};
 });
 assert.deepEqual(data.levels,[11,5]);assert.equal(data.overlay,2);assert.equal(data.overlayMagic,'MLF1');
 await page.getByText('Got it',{exact:true}).click();
 await page.mouse.click(770,310,{button:'right'});
 await page.waitForFunction(()=>/\d/.test(document.querySelector('.moon-site .feas .val')?.textContent||''),null,{timeout:90000});
 console.log(JSON.stringify({data,score:await page.locator('.moon-site .feas .val').innerText(),errors}));assert.equal(errors.length,0);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
