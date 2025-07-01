const fs = require('fs');
const path = require('path');

const metrics = ['production','imports','exports','domestic_supply','feed','processing','protein','fat'];

const data = JSON.parse(fs.readFileSync(path.join(__dirname,'../public/data/fao/timeseries.json'), 'utf-8'));

function computeDeciles(values){
  values.sort((a,b)=>a-b);
  const deciles=[];
  for(let i=1;i<10;i++){
    const pos = i*values.length/10;
    deciles.push(values[Math.floor(pos)]);
  }
  return deciles;
}

metrics.forEach(m=>{
  const vals=[];
  data.forEach(entry=>{
    entry.data.forEach(yd=>{
      if(yd[m]) vals.push(yd[m]);
    });
  });
  if(vals.length===0){
    console.log(`${m}: keine Daten`);return;
  }
  const dec=computeDeciles(vals);
  console.log(`${m}: max=${Math.max(...vals)} 10th=${dec[8]}`);
}); 